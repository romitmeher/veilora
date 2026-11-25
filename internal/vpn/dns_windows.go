//go:build windows

package vpn

import (
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"net/netip"
	"regexp"
	"strings"
)

type dnsAdapterSnapshot struct {
	GUID string   `json:"guid"`
	IPv4 []string `json:"ipv4"`
	IPv6 []string `json:"ipv6"`
}

type dnsPlan struct {
	GUID    string   `json:"guid"`
	Family  string   `json:"family"`
	Servers []string `json:"servers"`
}

// NameServer stores explicitly configured servers; an empty value means automatic
// DNS. Snapshot both families by adapter GUID so DHCP and secondary servers survive.
const snapshotDNSScript = `$ErrorActionPreference = 'Stop'
$items = @(Get-NetAdapter | Where-Object {
 $_.Status -eq 'Up' -and $_.InterfaceDescription -notmatch 'TAP-Windows|SoftEther|Wintun'
} | ForEach-Object {
 $guid = ([guid]$_.InterfaceGuid).ToString('B')
 $v4 = Get-ItemProperty -LiteralPath ('HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces\' + $guid)
 $v6Path = 'HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip6\Parameters\Interfaces\' + $guid
 $v6 = if (Test-Path -LiteralPath $v6Path) { Get-ItemProperty -LiteralPath $v6Path } else { $null }
 [pscustomobject]@{ guid=$guid; ipv4=@(([string]$v4.NameServer -split '[,;\s]+') | Where-Object { $_ }); ipv6=@(([string]$v6.NameServer -split '[,;\s]+') | Where-Object { $_ }) }
})
ConvertTo-Json -InputObject $items -Compress -Depth 4`

func getSystemDNS() (string, error) {
	out, err := hiddenCommand("powershell", "-NoProfile", "-NonInteractive", "-Command", snapshotDNSScript).CombinedOutput()
	if err != nil {
		return "", fmt.Errorf("snapshot DNS: %w (%s)", err, out)
	}
	snapshot := strings.TrimSpace(string(out))
	if _, err := parseDNSSnapshot(snapshot); err != nil {
		return "", err
	}
	return snapshot, nil
}

var adapterGUID = regexp.MustCompile(`^\{[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\}$`)

func parseDNSSnapshot(snapshot string) ([]dnsAdapterSnapshot, error) {
	var adapters []dnsAdapterSnapshot
	if err := json.Unmarshal([]byte(snapshot), &adapters); err != nil {
		return nil, fmt.Errorf("decode DNS snapshot: %w", err)
	}
	if len(adapters) == 0 {
		return nil, errors.New("no active adapters to configure")
	}
	for _, adapter := range adapters {
		if !adapterGUID.MatchString(adapter.GUID) {
			return nil, errors.New("invalid adapter GUID in DNS snapshot")
		}
		for family, servers := range map[string][]string{"ipv4": adapter.IPv4, "ipv6": adapter.IPv6} {
			for _, server := range servers {
				ip, err := netip.ParseAddr(server)
				if err != nil || (family == "ipv4") != ip.Is4() {
					return nil, errors.New("invalid address in DNS snapshot")
				}
			}
		}
	}
	return adapters, nil
}

func dnsPlans(snapshot, resolver string) ([]dnsPlan, error) {
	adapters, err := parseDNSSnapshot(snapshot)
	if err != nil {
		return nil, err
	}
	family := "ipv4"
	if resolver != "" {
		ip := net.ParseIP(resolver)
		if ip == nil {
			return nil, errors.New("invalid DNS resolver")
		}
		if ip.To4() == nil {
			family = "ipv6"
		}
	}
	plans := make([]dnsPlan, 0, len(adapters)*2)
	for _, adapter := range adapters {
		if resolver != "" {
			plans = append(plans, dnsPlan{adapter.GUID, family, []string{resolver}})
		} else {
			plans = append(plans, dnsPlan{adapter.GUID, "ipv4", adapter.IPv4}, dnsPlan{adapter.GUID, "ipv6", adapter.IPv6})
		}
	}
	return plans, nil
}

func applySystemDNS(resolver, snapshot string) error {
	plans, err := dnsPlans(snapshot, resolver)
	if err != nil {
		return err
	}
	return executeDNSPlans(plans, true)
}

func restoreSystemDNS(snapshot string) error {
	plans, err := dnsPlans(snapshot, "")
	if err != nil {
		return err
	}
	return executeDNSPlans(plans, false)
}

func executeDNSPlans(plans []dnsPlan, overrideMode bool) error {
	data, err := json.Marshal(plans)
	if err != nil {
		return err
	}
	overrideFlag := "$false"
	if overrideMode {
		overrideFlag = "$true"
	}
	// Only base64-encoded, validated data is interpolated. Every native exit status
	// is checked, and restoration continues across adapters to report all failures.
	script := `$ErrorActionPreference = 'Stop'
$overrideMode = ` + overrideFlag + `
$plans = ConvertFrom-Json ([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('` + base64.StdEncoding.EncodeToString(data) + `')))
$failures = @()
foreach ($plan in $plans) {
 try {
  $adapter = @(Get-NetAdapter -IncludeHidden | Where-Object { ([guid]$_.InterfaceGuid).ToString('B') -eq $plan.guid })
  if ($adapter.Count -ne 1) {
   if (-not $overrideMode) { continue }
   throw ('Adapter unavailable: ' + $plan.guid)
  }
  $dnsName = 'name=' + $adapter[0].ifIndex
  $servers = @($plan.servers | Where-Object { $_ })
  if ($servers.Count -eq 0) {
   & "$env:SystemRoot\System32\netsh.exe" interface $plan.family set dnsservers $dnsName source=dhcp | Out-Null
   if ($LASTEXITCODE -ne 0) { throw 'Failed to restore automatic DNS' }
  } else {
   for ($i = 0; $i -lt $servers.Count; $i++) {
    $dnsAddress = 'address=' + $servers[$i]
    if ($i -eq 0) {
     & "$env:SystemRoot\System32\netsh.exe" interface $plan.family set dnsservers $dnsName source=static $dnsAddress validate=no | Out-Null
    } else {
     $dnsIndex = 'index=' + ($i + 1)
     & "$env:SystemRoot\System32\netsh.exe" interface $plan.family add dnsservers $dnsName $dnsAddress $dnsIndex validate=no | Out-Null
    }
    if ($LASTEXITCODE -ne 0) { throw 'Failed to apply static DNS' }
   }
   if ($overrideMode -and $plan.family -eq 'ipv4') {
    & "$env:SystemRoot\System32\netsh.exe" interface ipv6 delete dnsservers $dnsName all 2>$null | Out-Null
   }
  }
 } catch { $failures += $_.Exception.Message }
}
if ($failures.Count) { throw ($failures -join '; ') }`
	out, err := hiddenCommand("powershell", "-NoProfile", "-NonInteractive", "-Command", script).CombinedOutput()
	if err != nil {
		return fmt.Errorf("configure DNS: %w (%s)", err, out)
	}
	return nil
}
