package app

import (
	"context"
	"log"
	"time"

	"github.com/irbis-sh/zen-desktop/internal/elevate"
	"github.com/irbis-sh/zen-desktop/internal/vpn"
)

func (a *App) Startup(ctx context.Context) {
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
