// Explicitly isolated development-only fixture for browser UI inspection outside the Wails runtime.
// Tree-shaken out of production builds (`import.meta.env.DEV` is false in `vite build`).

import defaultConfig from '../../internal/config/default-config.json';

interface DevFilterList {
  url: string;
  name: string;
  enabled: boolean;
  type: string;
  trusted?: boolean;
}

export function installDevWailsFixture(): void {
  if (!import.meta.env.DEV || typeof window === 'undefined') return;
  const w = window as unknown as Record<string, unknown>;
  if (w.go) return;

  const FILTER_STORAGE_KEY = 'veilora_dev_filter_lists';
  const RULES_STORAGE_KEY = 'veilora_dev_custom_rules';

  const loadFilterLists = (): DevFilterList[] => {
    try {
      const saved = window.localStorage.getItem(FILTER_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item: DevFilterList) => ({
            ...item,
            name: item.name?.replace(/^Zen - /, 'Veilora - ') ?? item.name,
          }));
        }
      }
    } catch {
      // ignore storage errors
    }
    return defaultConfig.filter.filterLists.map((item) => ({ ...item }));
  };

  let devFilterLists: DevFilterList[] = loadFilterLists();
  const saveFilterLists = () => {
    try {
      window.localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(devFilterLists));
    } catch {
      // ignore storage errors
    }
  };

  let devRules: string[] = (() => {
    try {
      const saved = window.localStorage.getItem(RULES_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore storage errors
    }
    return [];
  })();

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

  const listeners = new Map<string, Set<(data: unknown) => void>>();
  const emitEvent = (name: string, data: unknown) => {
    listeners.get(name)?.forEach((cb) => cb(data));
  };

  w.runtime = {
    EventsOnMultiple: (name: string, cb: (data: unknown) => void) => {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name)!.add(cb);
      return () => {
        listeners.get(name)?.delete(cb);
      };
    },
    EventsOff: (name: string) => {
      listeners.delete(name);
    },
    EventsEmit: emitEvent,
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
        GetFilterLists: async () => devFilterLists.map((item) => ({ ...item })),
        ToggleFilterList: async (url: string, enabled: boolean) => {
          devFilterLists = devFilterLists.map((item) =>
            item.url === url ? { ...item, enabled } : item,
          );
          saveFilterLists();
        },
        RemoveFilterList: async (url: string) => {
          devFilterLists = devFilterLists.filter((item) => item.url !== url);
          saveFilterLists();
        },
        AddFilterList: async (list: DevFilterList) => {
          if (!devFilterLists.some((item) => item.url === list.url)) {
            devFilterLists = [...devFilterLists, { ...list }];
            saveFilterLists();
          }
        },
        GetRules: async () => [...devRules],
        SetRules: async (rules: string[]) => {
          devRules = Array.isArray(rules) ? [...rules] : [];
          try {
            window.localStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(devRules));
          } catch {
            // ignore storage errors
          }
        },
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
        StartProxy: async () => {
          emitEvent('proxy:action', { kind: 'starting' });
          window.setTimeout(() => emitEvent('proxy:action', { kind: 'started' }), 150);
        },
        StopProxy: async () => {
          emitEvent('proxy:action', { kind: 'stopping' });
          window.setTimeout(() => emitEvent('proxy:action', { kind: 'stopped' }), 150);
        },
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
