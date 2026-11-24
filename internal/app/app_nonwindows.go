//go:build !windows

package app

import "context"

func (a *App) Startup(ctx context.Context) {
	a.commonStartup(ctx)
}

func (a *App) cleanupSoftEtherOnShutdown(context.Context) {}
