package vpn

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"time"
)

func programDataDir() string {
	if pd := os.Getenv("ProgramData"); pd != "" {
		return pd
	}
	if pd := os.Getenv("ALLUSERSPROFILE"); pd != "" {
		return pd
	}
	return `C:\ProgramData`
}

func defaultSoftEtherRuntimeDir() string {
	return filepath.Join(programDataDir(), "Veilora", "softether")
}

func defaultSoftEtherOwnershipPath() string {
	return filepath.Join(programDataDir(), "Veilora", "softether-ownership.json")
}

func loadSoftEtherOwnership(path string) (SoftEtherOwnership, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return SoftEtherOwnership{}, err
	}
	var own SoftEtherOwnership
	if err := json.Unmarshal(data, &own); err != nil {
		return SoftEtherOwnership{}, err
	}
	return own, nil
}

func saveSoftEtherOwnership(path string, own SoftEtherOwnership) error {
	if own.UpdatedAt == "" {
		own.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
	}
	if err := os.MkdirAll(filepath.Dir(path), 0700); err != nil {
		return err
	}
	data, err := json.MarshalIndent(own, "", "  ")
	if err != nil {
		return err
	}
	tmp := path + ".tmp"
	if err := os.WriteFile(tmp, data, 0600); err != nil {
		return err
	}
	return os.Rename(tmp, path)
}

func removeSoftEtherOwnership(path string) error {
	err := os.Remove(path)
	if errors.Is(err, os.ErrNotExist) {
		return nil
	}
	return err
}

func parseSCQCImagePath(output []byte) string {
	for _, line := range strings.Split(string(output), "\n") {
		trimmed := strings.TrimSpace(line)
		upper := strings.ToUpper(trimmed)
		if strings.HasPrefix(upper, "BINARY_PATH_NAME") {
			idx := strings.Index(trimmed, ":")
			if idx < 0 {
				continue
			}
			val := strings.TrimSpace(trimmed[idx+1:])
			if strings.HasPrefix(val, `"`) {
				if end := strings.Index(val[1:], `"`); end >= 0 {
					return val[1 : 1+end]
				}
			}
			fields := strings.Fields(val)
			if len(fields) > 0 {
				return fields[0]
			}
		}
	}
	return ""
}

func verifyOwnedService(own SoftEtherOwnership, scQCOutput []byte) bool {
	if !own.ServiceOwned || own.Service == "" || own.ServiceBinaryPath == "" {
		return false
	}
	actual := parseSCQCImagePath(scQCOutput)
	if actual == "" {
		return false
	}
	return strings.EqualFold(filepath.Clean(actual), filepath.Clean(own.ServiceBinaryPath))
}
