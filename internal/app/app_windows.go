package app

import (
	"context"
	"log"
	"os"
	"time"

	"github.com/irbis-sh/zen-desktop/internal/elevate"
	"github.com/irbis-sh/zen-desktop/internal/vpn"
)

func (a *App) Startup(ctx context.Context) {
	if !elevate.IsElevated() {
		if err := elevate.RelaunchElevated(); err != nil {
			log.Printf("administrator privileges required: %v", err)
			os.Exit(1)
		}
		os.Exit(0)
	}
	runShutdownOnWmEndsession(ctx)
	a.commonStartup(ctx)
}

func (a *App) cleanupSoftEtherOnShutdown(ctx context.Context) {
	if !elevate.IsElevated() {
		return
	}
	cleanupCtx, cancel := context.WithTimeout(ctx, 2*time.Minute)
	defer cancel()
	if err := vpn.CleanupBundledSoftEther(cleanupCtx); err != nil {
		log.Printf("SoftEther shutdown cleanup: %v", err)
	}
}
