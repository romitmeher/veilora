// Explicitly isolated development-only fixture for browser UI inspection outside the Wails runtime.
// Tree-shaken out of production builds (`import.meta.env.DEV` is false in `vite build`).

export function installDevWailsFixture(): void {
  if (!import.meta.env.DEV || typeof window === 'undefined') return;
  const w = window as unknown as Record<string, unknown>;
  if (w.go) return;

  const sampleServers = [
    {
      hostName: 'vpn-jp-tokyo-01',
      ip: '219.100.37.208',
      score: 980000,
      ping: 42,
      speed: 84_000_000,
      countryLong: 'Japan',
      countryShort: 'JP',
      numVpnSessions: 31,
      uptime: 432_000_000,
      totalUsers: 1200,
      totalTraffic: 9_000_000_000,
      logType: '2weeks',
      operator: 'University of Tsukuba',
      message: '',
      computedScore: 98,
      openVpnConfigBase64: '',
    },
    {
      hostName: 'vpn-de-frankfurt-04',
      ip: '195.201.14.82',
      score: 760000,
      ping: 118,
      speed: 52_000_000,
      countryLong: 'Germany',
      countryShort: 'DE',
      numVpnSessions: 14,
      uptime: 172_800_000,
      totalUsers: 640,
      totalTraffic: 4_200_000_000,
      logType: '2weeks',
      operator: 'Academic Mirror',
      message: '',
      computedScore: 76,
      openVpnConfigBase64: '',
    },
    {
      hostName: 'vpn-us-oregon-09',
      ip: '198.51.100.44',
      score: 540000,
      ping: 185,
      speed: 24_000_000,
      countryLong: 'United States',
      countryShort: 'US',
      numVpnSessions: 9,
      uptime: 86_400_000,
      totalUsers: 310,
      totalTraffic: 1_800_000_000,
      logType: '2weeks',
      operator: 'Volunteer Node',
      message: '',
      computedScore: 54,
      openVpnConfigBase64: '',
    },
  ];

  w.runtime = {
    EventsOnMultiple: () => () => {},
    EventsOff: () => {},
    EventsEmit: () => {},
    BrowserOpenURL: (url: string) => window.open(url, '_blank', 'noopener,noreferrer'),
  };

  w.go = {
    config: {
      Config: {
        GetFirstLaunch: async () => false,
        GetTheme: async () => 'dark',
        SetTheme: async () => {},
        GetLocale: async () => 'en-US',
        SetLocale: async () => {},
        GetPort: async () => 8899,
        SetPort: async () => {},
        GetAssetPort: async () => 8898,
        SetAssetPort: async () => {},
        GetIgnoredHosts: async () => [],
        SetIgnoredHosts: async () => {},
        GetFilterLists: async () => [],
        ToggleFilterList: async () => {},
        RemoveFilterList: async () => {},
        AddFilterList: async () => {},
        GetCustomRules: async () => '',
        SetCustomRules: async () => {},
        GetAutoupdate: async () => true,
        SetAutoupdate: async () => {},
        GetRoutingMode: async () => 'all',
        GetAppRoutingList: async () => [],
      },
    },
    autostart: {
      Manager: {
        IsEnabled: async () => false,
        Enable: async () => {},
        Disable: async () => {},
      },
    },
    app: {
      App: {
        StartProxy: async () => {},
        StopProxy: async () => {},
        RestartApplication: async () => {},
        GetVersion: async () => 'v1.0.0-dev-preview',
        VPNGetStatus: async () => ({
          serverHostName: '',
          serverIP: '',
          countryLong: '',
          countryShort: '',
          engine: 'openvpn',
          status: { state: 'disconnected', message: '' },
          killSwitchOn: false,
          dnsProtectionOn: false,
        }),
        VPNAvailableEngines: async () => ['openvpn'],
        VPNEngineAvailability: async () => [
          { engine: 'openvpn', ready: true, message: 'Ready' },
          { engine: 'softether', ready: false, message: 'Bundled runtime or Windows provisioning is not ready' },
        ],
        VPNGetCountries: async () => ['DE', 'JP', 'US'],
        VPNGetServers: async (country: string) =>
          country ? sampleServers.filter((s) => s.countryShort === country) : sampleServers,
        VPNRefreshServers: async () => {},
        VPNGetDNSResolver: async () => '1.1.1.1',
        VPNSetDNSResolver: async () => {},
        VPNConnectBest: async () => {},
        VPNConnectToServer: async () => {},
        VPNDisconnect: async () => {},
        VPNProvisionSoftEther: async () => ({}),
        VPNInstallEngine: async () => {},
      },
    },
  };
}
