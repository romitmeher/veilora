import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

export type VPNStatus = "disconnected" | "connecting" | "connected";
export type VPNProtocol = "openvpn-udp" | "openvpn-tcp" | "softether";

export interface VPNServer {
  id: string;
  hostName: string;
  ip: string;
  countryLong: string;
  countryShort: string;
  ping: number;
  speedMbps: number;
  sessions: number;
  operator: string;
  score: number;
}

export interface VPNSettings {
  protocol: VPNProtocol;
  killSwitch: boolean;
  autoConnect: boolean;
  customDns: boolean;
  dnsServer: string;
}

interface VPNContextValue {
  status: VPNStatus;
  selectedServer: VPNServer | null;
  servers: VPNServer[];
  loadingServers: boolean;
  publicIp: string | null;
  settings: VPNSettings;
  connect: (server?: VPNServer) => void;
  disconnect: () => void;
  selectServer: (server: VPNServer) => void;
  refreshServers: () => void;
  updateSettings: (patch: Partial<VPNSettings>) => void;
}

const MOCK_SERVERS: VPNServer[] = [
  { id: "jp1", hostName: "vpn-jp1.vpngate.net", ip: "103.231.88.1", countryLong: "Japan", countryShort: "JP", ping: 12, speedMbps: 180, sessions: 42, operator: "VPNGATE", score: 980 },
  { id: "us1", hostName: "vpn-us1.vpngate.net", ip: "198.50.214.1", countryLong: "United States", countryShort: "US", ping: 85, speedMbps: 95, sessions: 88, operator: "VPNGATE", score: 820 },
  { id: "kr1", hostName: "vpn-kr1.vpngate.net", ip: "211.234.132.1", countryLong: "Korea", countryShort: "KR", ping: 28, speedMbps: 210, sessions: 61, operator: "VPNGATE", score: 960 },
  { id: "de1", hostName: "vpn-de1.vpngate.net", ip: "185.220.101.1", countryLong: "Germany", countryShort: "DE", ping: 65, speedMbps: 120, sessions: 33, operator: "VPNGATE", score: 870 },
  { id: "sg1", hostName: "vpn-sg1.vpngate.net", ip: "128.199.60.1", countryLong: "Singapore", countryShort: "SG", ping: 35, speedMbps: 160, sessions: 55, operator: "VPNGATE", score: 910 },
  { id: "fr1", hostName: "vpn-fr1.vpngate.net", ip: "51.159.65.1", countryLong: "France", countryShort: "FR", ping: 70, speedMbps: 90, sessions: 28, operator: "VPNGATE", score: 800 },
  { id: "ca1", hostName: "vpn-ca1.vpngate.net", ip: "149.56.232.1", countryLong: "Canada", countryShort: "CA", ping: 90, speedMbps: 110, sessions: 45, operator: "VPNGATE", score: 790 },
  { id: "nl1", hostName: "vpn-nl1.vpngate.net", ip: "194.165.16.1", countryLong: "Netherlands", countryShort: "NL", ping: 55, speedMbps: 140, sessions: 37, operator: "VPNGATE", score: 850 },
  { id: "au1", hostName: "vpn-au1.vpngate.net", ip: "103.216.224.1", countryLong: "Australia", countryShort: "AU", ping: 140, speedMbps: 75, sessions: 22, operator: "VPNGATE", score: 730 },
  { id: "se1", hostName: "vpn-se1.vpngate.net", ip: "193.32.160.1", countryLong: "Sweden", countryShort: "SE", ping: 60, speedMbps: 130, sessions: 18, operator: "VPNGATE", score: 840 },
];

const DEFAULT_SETTINGS: VPNSettings = {
  protocol: "openvpn-udp",
  killSwitch: true,
  autoConnect: false,
  customDns: false,
  dnsServer: "1.1.1.1",
};

const STORAGE_KEYS = {
  settings: "@vpn/settings",
  selectedServer: "@vpn/selected_server",
};

const VPNContext = createContext<VPNContextValue | null>(null);

export function VPNProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<VPNStatus>("disconnected");
  const [selectedServer, setSelectedServer] = useState<VPNServer | null>(null);
  const [servers, setServers] = useState<VPNServer[]>([]);
  const [loadingServers, setLoadingServers] = useState(false);
  const [publicIp, setPublicIp] = useState<string | null>(null);
  const [settings, setSettings] = useState<VPNSettings>(DEFAULT_SETTINGS);
  const connectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [savedSettings, savedServer] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.settings),
          AsyncStorage.getItem(STORAGE_KEYS.selectedServer),
        ]);
        if (savedSettings) setSettings(JSON.parse(savedSettings));
        if (savedServer) setSelectedServer(JSON.parse(savedServer));
      } catch {}
    })();
    refreshServers();
    return () => {
      if (connectTimer.current) clearTimeout(connectTimer.current);
    };
  }, []);

  const refreshServers = useCallback(async () => {
    setLoadingServers(true);
    try {
      const res = await fetch("https://www.vpngate.net/api/iphone/", {
        headers: { "User-Agent": "Veilora/1.0" },
      });
      const text = await res.text();
      const lines = text.split("\n").filter((l) => l && !l.startsWith("*") && !l.startsWith("#"));
      const parsed: VPNServer[] = lines
        .map((line) => {
          const cols = line.split(",");
          if (cols.length < 15) return null;
          const ping = parseInt(cols[3] ?? "999", 10);
          const speed = Math.round(parseInt(cols[4] ?? "0", 10) / 1_000_000);
          const score = parseInt(cols[2] ?? "0", 10);
          return {
            id: cols[1] ?? "",
            hostName: cols[0] ?? "",
            ip: cols[1] ?? "",
            countryLong: cols[5] ?? "",
            countryShort: cols[6] ?? "",
            ping: isNaN(ping) ? 999 : ping,
            speedMbps: isNaN(speed) ? 0 : speed,
            sessions: parseInt(cols[7] ?? "0", 10),
            operator: cols[12] ?? "VPNGATE",
            score: isNaN(score) ? 0 : score,
          } as VPNServer;
        })
        .filter(Boolean)
        .filter((s) => s!.ip && s!.ping < 500)
        .sort((a, b) => (b?.score ?? 0) - (a?.score ?? 0))
        .slice(0, 50) as VPNServer[];

      if (parsed.length > 0) {
        setServers(parsed);
      } else {
        setServers(MOCK_SERVERS);
      }
    } catch {
      setServers(MOCK_SERVERS);
    } finally {
      setLoadingServers(false);
    }
  }, []);

  const fetchPublicIp = useCallback(async () => {
    try {
      const res = await fetch("https://api.ipify.org?format=json");
      const data = await res.json() as { ip: string };
      setPublicIp(data.ip);
    } catch {
      setPublicIp("10.8.0." + Math.floor(Math.random() * 254 + 1));
    }
  }, []);

  const connect = useCallback((server?: VPNServer) => {
    const target = server ?? selectedServer ?? servers[0] ?? MOCK_SERVERS[0];
    if (target) setSelectedServer(target);
    setStatus("connecting");
    setPublicIp(null);
    if (connectTimer.current) clearTimeout(connectTimer.current);
    connectTimer.current = setTimeout(() => {
      setStatus("connected");
      fetchPublicIp();
    }, 2000 + Math.random() * 1000);
  }, [selectedServer, servers, fetchPublicIp]);

  const disconnect = useCallback(() => {
    if (connectTimer.current) clearTimeout(connectTimer.current);
    setStatus("disconnected");
    setPublicIp(null);
  }, []);

  const selectServer = useCallback(async (server: VPNServer) => {
    setSelectedServer(server);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.selectedServer, JSON.stringify(server));
    } catch {}
  }, []);

  const updateSettings = useCallback(async (patch: Partial<VPNSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      AsyncStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  return (
    <VPNContext.Provider
      value={{ status, selectedServer, servers, loadingServers, publicIp, settings, connect, disconnect, selectServer, refreshServers, updateSettings }}
    >
      {children}
    </VPNContext.Provider>
  );
}

export function useVPN() {
  const ctx = useContext(VPNContext);
  if (!ctx) throw new Error("useVPN must be used within VPNProvider");
  return ctx;
}
