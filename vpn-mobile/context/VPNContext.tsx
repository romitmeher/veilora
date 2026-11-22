import AsyncStorage from "@react-native-async-storage/async-storage";
import { File, Paths } from "expo-file-system";
import * as IntentLauncher from "expo-intent-launcher";
import * as Sharing from "expo-sharing";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Linking, Platform } from "react-native";

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
  ovpnConfigBase64?: string;
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
  connect: (server?: VPNServer) => Promise<void>;
  disconnect: () => void;
  selectServer: (server: VPNServer) => void;
  refreshServers: () => Promise<void>;
  updateSettings: (patch: Partial<VPNSettings>) => void;
  openVPNSettings: () => Promise<void>;
}

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
  cachedServers: "@vpn/cached_servers",
};

const VPNContext = createContext<VPNContextValue | null>(null);

export function VPNProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<VPNStatus>("disconnected");
  const [selectedServer, setSelectedServer] = useState<VPNServer | null>(null);
  const [servers, setServers] = useState<VPNServer[]>([]);
  const [loadingServers, setLoadingServers] = useState(false);
  const [publicIp, setPublicIp] = useState<string | null>(null);
  const [settings, setSettings] = useState<VPNSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    (async () => {
      try {
        const [savedSettings, savedServer, cachedServers] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.settings),
          AsyncStorage.getItem(STORAGE_KEYS.selectedServer),
          AsyncStorage.getItem(STORAGE_KEYS.cachedServers),
        ]);
        if (savedSettings) setSettings(JSON.parse(savedSettings));
        if (savedServer) setSelectedServer(JSON.parse(savedServer));
        if (cachedServers) {
          const list = JSON.parse(cachedServers);
          if (Array.isArray(list) && list.length > 0) setServers(list);
        }
      } catch {}
    })();
    refreshServers();
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
          const b64 = cols[14] ? cols[14].trim() : undefined;
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
            ovpnConfigBase64: b64,
          } as VPNServer;
        })
        .filter(Boolean)
        .filter((s) => s!.ip && s!.ping < 600)
        .sort((a, b) => (b?.score ?? 0) - (a?.score ?? 0))
        .slice(0, 50) as VPNServer[];

      if (parsed.length > 0) {
        setServers(parsed);
        if (!selectedServer) {
          setSelectedServer(parsed[0]);
        }
        AsyncStorage.setItem(STORAGE_KEYS.cachedServers, JSON.stringify(parsed)).catch(() => {});
      }
    } catch (err) {
      console.warn("Failed to fetch VPNGate servers:", err);
    } finally {
      setLoadingServers(false);
    }
  }, [selectedServer]);

  const fetchPublicIp = useCallback(async () => {
    try {
      const res = await fetch("https://api.ipify.org?format=json");
      const data = (await res.json()) as { ip: string };
      setPublicIp(data.ip);
      return data.ip;
    } catch {
      setPublicIp(null);
      return null;
    }
  }, []);

  const connect = useCallback(
    async (server?: VPNServer) => {
      const target = server ?? selectedServer ?? servers[0];
      if (!target) return;
      setSelectedServer(target);
      setStatus("connecting");

      // Write real OpenVPN profile to disk and open system profile sharing/import
      try {
        if (target.ovpnConfigBase64) {
          const hostPart = (target.hostName || target.ip).split(".")[0];
          const file = new File(Paths.cache, `${target.countryShort}_${hostPart}.ovpn`);
          file.create({ overwrite: true });
          file.write(target.ovpnConfigBase64, { encoding: "base64" });

          if (Platform.OS !== "web" && (await Sharing.isAvailableAsync())) {
            await Sharing.shareAsync(file.uri, {
              mimeType: "application/x-openvpn-profile",
              dialogTitle: `Import ${target.countryLong} VPN Profile`,
              UTI: "public.text",
            });
          }
        }
      } catch (e) {
        console.warn("VPN profile export error:", e);
      }

      // Check public IP
      setTimeout(async () => {
        await fetchPublicIp();
        setStatus("connected");
      }, 1500);
    },
    [selectedServer, servers, fetchPublicIp]
  );

  const disconnect = useCallback(() => {
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

  const openVPNSettings = useCallback(async () => {
    if (Platform.OS === "android") {
      try {
        await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.VPN_SETTINGS);
      } catch {
        Linking.openSettings();
      }
    } else {
      Linking.openSettings();
    }
  }, []);

  return (
    <VPNContext.Provider
      value={{
        status,
        selectedServer,
        servers,
        loadingServers,
        publicIp,
        settings,
        connect,
        disconnect,
        selectServer,
        refreshServers,
        updateSettings,
        openVPNSettings,
      }}
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
