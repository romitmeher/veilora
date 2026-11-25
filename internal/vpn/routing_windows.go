//go:build windows

package vpn

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
)

type routeMetricSnapshot struct {
	Index     int    `json:"index"`
	Metric    uint32 `json:"metric"`
	Automatic bool   `json:"automatic"`
}

const snapshotRoutesScript = `$vpn = @(Get-NetAdapter -IncludeHidden | Where-Object {
 $_.Status -eq 'Up' -and (
  $_.Name -eq 'VPN' -or $_.InterfaceDescription -match 'SoftEther Virtual Network Adapter'
 )
})
$items = @($vpn | Sort-Object -Unique ifIndex | ForEach-Object {
 $interface = Get-NetIPInterface -AddressFamily IPv4 -InterfaceIndex $_.ifIndex -ErrorAction SilentlyContinue
 [pscustomobject]@{
  index=[int]$_.ifIndex
  metric=[uint32]$(if ($interface) { $interface.InterfaceMetric } else { 0 })
  automatic=[bool]$(if ($interface) { $interface.AutomaticMetric } else { $true })
 }
})
if ($items.Count -eq 0) { throw 'SoftEther VPN adapter not found' }
ConvertTo-Json -InputObject $items -Compress -Depth 3`

func enableSoftEtherRouting(adapterName string) (string, error) {
	if adapterName == "" {
		adapterName = softEtherAdapterName
	}
	if !safeSoftEtherHost.MatchString(adapterName) {
		return "", fmt.Errorf("invalid SoftEther adapter name %q", adapterName)
	}
	out, err := hiddenCommand("powershell", "-NoProfile", "-NonInteractive", "-Command", snapshotRoutesScript).CombinedOutput()
	if err != nil {
		return "", fmt.Errorf("snapshot routes: %w (%s)", err, out)
	}
	var snapshot []routeMetricSnapshot
	if err := json.Unmarshal(out, &snapshot); err != nil {
		return "", fmt.Errorf("decode route snapshot: %w", err)
	}
	encoded, err := json.Marshal(snapshot)
	if err != nil {
		return "", err
	}

	script := `$ErrorActionPreference='Stop'
$vpn = @()
for ($i = 0; $i -lt 20 -and $vpn.Count -ne 1; $i++) {
 $vpn = @(Get-NetAdapter -IncludeHidden | Where-Object {
  $_.Status -eq 'Up' -and $_.Name -eq '` + adapterName + `' -and (
   $_.InterfaceDescription -match 'SoftEther|VPN Client Adapter'
  )
 })
 if ($vpn.Count -ne 1) { Start-Sleep -Milliseconds 250 }
}
if ($vpn.Count -ne 1) { throw 'SoftEther VPN adapter not found' }
Set-NetIPInterface -InterfaceIndex $vpn[0].ifIndex -AddressFamily IPv4 -AutomaticMetric Disabled -InterfaceMetric 1
`
	if out, err := hiddenCommand("powershell", "-NoProfile", "-NonInteractive", "-Command", script).CombinedOutput(); err != nil {
		return "", fmt.Errorf("apply route priority: %w (%s)", err, out)
	}
	return base64.StdEncoding.EncodeToString(encoded), nil
}

func restoreSoftEtherRouting(snapshot string) error {
	data, err := base64.StdEncoding.DecodeString(snapshot)
	if err != nil {
		return err
	}
	var routes []routeMetricSnapshot
	if err := json.Unmarshal(data, &routes); err != nil {
		return err
	}
	plans, err := json.Marshal(routes)
	if err != nil {
		return err
	}

	script := `$ErrorActionPreference='Stop'
$routes = ConvertFrom-Json ([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('` + base64.StdEncoding.EncodeToString(plans) + `')))
$failures = @()
foreach ($route in $routes) {
 try {
  if ($route.automatic) {
   Set-NetIPInterface -InterfaceIndex $route.index -AddressFamily IPv4 -AutomaticMetric Enabled -ErrorAction Stop
  } else {
   Set-NetIPInterface -InterfaceIndex $route.index -AddressFamily IPv4 -AutomaticMetric Disabled -InterfaceMetric $route.metric -ErrorAction Stop
  }
  } catch {
   $failures += "interface $($route.index): $($_.Exception.Message)"
  }
}
if ($failures.Count) { throw ($failures -join '; ') }
}`
	if out, err := hiddenCommand("powershell", "-NoProfile", "-NonInteractive", "-Command", script).CombinedOutput(); err != nil {
		return fmt.Errorf("restore route priority: %w (%s)", err, out)
	}
	return nil
}
