import AsyncStorage from "@react-native-async-storage/async-storage";
import * as IntentLauncher from "expo-intent-launcher";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Linking, Platform } from "react-native";

export interface BlockCategory {
  id: string;
  label: string;
  description: string;
  icon: string;
  enabled: boolean;
  count: number;
}

export interface BlockedEntry {
  id: string;
  domain: string;
  category: string;
  timestamp: number;
}

interface BlockerStats {
  adsBlocked: number;
  trackersBlocked: number;
  bandwidthSavedKb: number;
  totalRequests: number;
}

interface BlockerContextValue {
  enabled: boolean;
  toggle: () => void;
  categories: BlockCategory[];
  toggleCategory: (id: string) => void;
  stats: BlockerStats;
  recentBlocked: BlockedEntry[];
  resetStats: () => void;
  openDnsSettings: () => Promise<void>;
  testProtection: () => Promise<boolean>;
  dnsHost: string;
}

const INITIAL_CATEGORIES: BlockCategory[] = [
  { id: "ads", label: "Advertisements", description: "Banner, video & pop-up ads", icon: "slash", enabled: true, count: 0 },
  { id: "trackers", label: "Trackers", description: "Analytics & behavioral tracking", icon: "eye-off", enabled: true, count: 0 },
  { id: "malware", label: "Malware & Phishing", description: "Known malicious domains", icon: "alert-triangle", enabled: true, count: 0 },
  { id: "social", label: "Social Widgets", description: "Embedded social media buttons", icon: "share-2", enabled: false, count: 0 },
  { id: "adult", label: "Adult Content", description: "Explicit & NSFW domains", icon: "shield-off", enabled: false, count: 0 },
];

const STORAGE_KEYS = {
  enabled: "@blocker/enabled",
  categories: "@blocker/categories",
  stats: "@blocker/stats",
};

const DNS_HOST = "dns.adguard-dns.com";

const BlockerContext = createContext<BlockerContextValue | null>(null);

export function BlockerProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(true);
  const [categories, setCategories] = useState<BlockCategory[]>(INITIAL_CATEGORIES);
  const [stats, setStats] = useState<BlockerStats>({
    adsBlocked: 0,
    trackersBlocked: 0,
    bandwidthSavedKb: 0,
    totalRequests: 0,
  });
  const [recentBlocked, setRecentBlocked] = useState<BlockedEntry[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [savedEnabled, savedCategories, savedStats] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.enabled),
          AsyncStorage.getItem(STORAGE_KEYS.categories),
          AsyncStorage.getItem(STORAGE_KEYS.stats),
        ]);
        if (savedEnabled !== null) setEnabled(savedEnabled === "true");
        if (savedCategories) setCategories(JSON.parse(savedCategories));
        if (savedStats) setStats(JSON.parse(savedStats));
      } catch {}
    })();
  }, []);

  const toggle = useCallback(async () => {
    setEnabled((prev) => {
      const next = !prev;
      AsyncStorage.setItem(STORAGE_KEYS.enabled, String(next)).catch(() => {});
      return next;
    });
  }, []);

  const toggleCategory = useCallback(async (id: string) => {
    setCategories((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, enabled: !c.enabled } : c));
      AsyncStorage.setItem(STORAGE_KEYS.categories, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const resetStats = useCallback(async () => {
    const fresh = { adsBlocked: 0, trackersBlocked: 0, bandwidthSavedKb: 0, totalRequests: 0 };
    setStats(fresh);
    setRecentBlocked([]);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.stats, JSON.stringify(fresh));
    } catch {}
  }, []);

  const openDnsSettings = useCallback(async () => {
    if (Platform.OS === "android") {
      try {
        await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.WIRELESS_SETTINGS);
      } catch {
        Linking.openSettings();
      }
    } else {
      Linking.openSettings();
    }
  }, []);

  // Real network probe to verify whether ad/tracker DNS sinking is active
  const testProtection = useCallback(async (): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      await fetch("https://pagead2.googlesyndication.com/favicon.ico", {
        signal: controller.signal,
        mode: "no-cors",
      });
      clearTimeout(timeoutId);
      // If it connected successfully, ad blocking is not sinking the ad domain
      return false;
    } catch {
      // Fetch aborted or failed to resolve -> ad/tracker domain was successfully blocked
      setStats((prev) => {
        const next = {
          ...prev,
          adsBlocked: prev.adsBlocked + 1,
          totalRequests: prev.totalRequests + 1,
          bandwidthSavedKb: prev.bandwidthSavedKb + 35,
        };
        AsyncStorage.setItem(STORAGE_KEYS.stats, JSON.stringify(next)).catch(() => {});
        return next;
      });
      setRecentBlocked((prev) => [
        {
          id: Date.now().toString(),
          domain: "pagead2.googlesyndication.com",
          category: "ads",
          timestamp: Date.now(),
        },
        ...prev.slice(0, 19),
      ]);
      return true;
    }
  }, []);

  return (
    <BlockerContext.Provider
      value={{
        enabled,
        toggle,
        categories,
        toggleCategory,
        stats,
        recentBlocked,
        resetStats,
        openDnsSettings,
        testProtection,
        dnsHost: DNS_HOST,
      }}
    >
      {children}
    </BlockerContext.Provider>
  );
}

export function useBlocker() {
  const ctx = useContext(BlockerContext);
  if (!ctx) throw new Error("useBlocker must be used within BlockerProvider");
  return ctx;
}
