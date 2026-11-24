//go:build windows

package elevate

import (
	"log"
	"os"
	"syscall"

	"golang.org/x/sys/windows"
)

// IsElevated checks whether the current process has administrator privileges.
func IsElevated() bool {
	var token windows.Token
	err := windows.OpenProcessToken(windows.CurrentProcess(), windows.TOKEN_QUERY, &token)
	if err != nil {
		return false
	}
	defer token.Close()
	return token.IsElevated()
}

// RelaunchElevated triggers a Windows UAC prompt to restart the current process with administrator rights.
func RelaunchElevated() error {
	exe, err := os.Executable()
	if err != nil {
		return err
	}
	verbPtr, err := syscall.UTF16PtrFromString("runas")
	if err != nil {
		return err
	}
	exePtr, err := syscall.UTF16PtrFromString(exe)
	if err != nil {
		return err
	}

	var argsStr string
	for i, arg := range os.Args[1:] {
		if i > 0 {
			argsStr += " "
		}
		argsStr += syscall.EscapeArg(arg)
	}
	argsPtr, err := syscall.UTF16PtrFromString(argsStr)
	if err != nil {
		return err
	}

	cwd, _ := os.Getwd()
	cwdPtr, _ := syscall.UTF16PtrFromString(cwd)

	log.Printf("elevate: requesting administrator elevation via runas")
	err = windows.ShellExecute(0, verbPtr, exePtr, argsPtr, cwdPtr, windows.SW_SHOWNORMAL)
	if err != nil {
		return err
	}
	return nil
}
