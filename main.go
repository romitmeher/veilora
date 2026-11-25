package main

import (
	"context"
	"embed"
	"flag"
	"fmt"
	"log"
	"os"
	"runtime"

	"github.com/irbis-sh/zen-desktop/internal/app"
	"github.com/irbis-sh/zen-desktop/internal/autostart"
	"github.com/irbis-sh/zen-desktop/internal/config"
	"github.com/irbis-sh/zen-desktop/internal/constants"
	"github.com/irbis-sh/zen-desktop/internal/logger"
	"github.com/irbis-sh/zen-desktop/internal/vpn"
	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/mac"
)

const (
	windowWidth  = 980
	windowHeight = 760
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	startOnDomReady := flag.Bool("start", false, "Start the service when DOM is ready")
	startHidden := flag.Bool("hidden", false, "Start the application in hidden mode")
	uninstallCA := flag.Bool("uninstall-ca", false, "Uninstall the CA and exit")
	uninstallVPN := flag.Bool("uninstall-vpn", false, "Uninstall Veilora-owned VPN components and exit")
	flag.Parse()

	err := logger.SetupLogger()
	if err != nil {
		log.Printf("failed to setup logger: %v", err)
	}
	log.Printf("initializing the app; version=%q", config.Version)

	appConfig, err := config.New()
	if err != nil {
		log.Fatalf("failed to load config: %v", err)
	}

	app, err := app.NewApp(constants.AppName, appConfig, *startOnDomReady)
	if err != nil {
		log.Fatalf("failed to create app: %v", err)
	}

	if *uninstallCA {
		if err := app.UninstallCA(); err != nil {
			// UninstallCA logs the error internally
			os.Exit(1)
		}

		log.Println("CA uninstalled successfully")
		return
	}

	if *uninstallVPN {
		if err := vpn.UninstallBundledSoftEther(context.Background()); err != nil {
			log.Printf("VPN uninstall cleanup failed: %v", err)
			os.Exit(1)
		}
		log.Println("Veilora-owned VPN components uninstalled successfully")
		return
	}

	autostart := &autostart.Manager{}

	err = wails.Run(&options.App{
		Title:         constants.AppName,
		Width:         windowWidth,
		Height:        windowHeight,
		MinWidth:      720,
		MinHeight:     600,
		DisableResize: false,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		OnStartup:     app.Startup,
		OnBeforeClose: app.BeforeClose,
		SingleInstanceLock: &options.SingleInstanceLock{
			UniqueId:               constants.InstanceID,
			OnSecondInstanceLaunch: app.OnSecondInstanceLaunch,
		},
		Bind: []interface{}{
			app,
			appConfig,
			autostart,
		},
		EnumBind: []interface{}{
			config.UpdatePolicyEnum,
			config.RoutingModeEnum,
		},
		Mac: &mac.Options{
			About: &mac.AboutInfo{
				Title:   constants.AppName,
				Message: fmt.Sprintf("Your Comprehensive Ad-Blocker and Privacy Guard\nVersion: %s\n© 2026 Zen contributors", config.Version),
			},
		},
		HideWindowOnClose: runtime.GOOS == "darwin" || runtime.GOOS == "windows",
		StartHidden:       *startHidden,
	})
	vpn.CleanupBundledRuntime()
	vpn.CleanupBundledSoftEtherRuntime()

	if err != nil {
		log.Fatal(err)
	}
}
