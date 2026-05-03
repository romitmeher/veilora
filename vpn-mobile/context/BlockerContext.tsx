import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

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
}

const INITIAL_CATEGORIES: BlockCategory[] = [
  { id: "ads", label: "Advertisements", description: "Banner, video & pop-up ads", icon: "slash", enabled: true, count: 0 },
  { id: "trackers", label: "Trackers", description: "Analytics & behavioral tracking", icon: "eye-off", enabled: true, count: 0 },
  { id: "malware", label: "Malware & Phishing", description: "Known malicious domains", icon: "alert-triangle", enabled: true, count: 0 },
  { id: "social", label: "Social Widgets", description: "Embedded social media buttons", icon: "share-2", enabled: false, count: 0 },
  { id: "adult", label: "Adult Content", description: "Explicit & NSFW domains", icon: "shield-off", enabled: false, count: 0 },
];

const AD_DOMAINS = [
  "doubleclick.net", "googleadservices.com", "googlesyndication.com",
  "ads.facebook.com", "advertising.com", "adnxs.com", "criteo.com",
  "outbrain.com", "taboola.com", "rubiconproject.com", "pubmatic.com",
  "openx.net", "casalemedia.com", "sovrn.com", "sharethrough.com",
];
const TRACKER_DOMAINS = [
  "google-analytics.com", "segment.io", "mixpanel.com", "hotjar.com",
  "mouseflow.com", "amplitude.com", "heap.io", "fullstory.com",
  "clarity.ms", "quantserve.com", "comscore.com", "scorecardresearch.com",
];
const MALWARE_DOMAINS = [
  "malware-traffic-analysis.net", "phishtank.com", "urlvoid.com",
  "suspicious-domain.xyz", "click-fraud-site.ru", "fake-update.win",
];
const SOCIAL_DOMAINS = [
  "connect.facebook.net", "platform.twitter.com", "platform.linkedin.com",
  "apis.google.com", "assets.pinterest.com",
];

const CATEGORY_DOMAINS: Record<string, string[]> = {
  ads: AD_DOMAINS,
  trackers: TRACKER_DOMAINS,
  malware: MALWARE_DOMAINS,
  social: SOCIAL_DOMAINS,
};

const STORAGE_KEYS = {
  enabled: "@blocker/enabled",
  categories: "@blocker/categories",
  stats: "@blocker/stats",
};

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
  const simulationTimer = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // Simulate live blocking activity when enabled
  useEffect(() => {
    if (!enabled) {
      if (simulationTimer.current) clearInterval(simulationTimer.current);
      return;
    }
    simulationTimer.current = setInterval(() => {
      setCategories((prev) => {
        const enabledCats = prev.filter((c) => c.enabled);
        if (enabledCats.length === 0) return prev;
        const cat = enabledCats[Math.floor(Math.random() * enabledCats.length)];
        const domains = CATEGORY_DOMAINS[cat.id] ?? AD_DOMAINS;
        const domain = domains[Math.floor(Math.random() * domains.length)];

        const entry: BlockedEntry = {
          id: Date.now().toString() + Math.random().toString(36).slice(2),
          domain,
          category: cat.id,
          timestamp: Date.now(),
        };
        setRecentBlocked((prev) => [entry, ...prev].slice(0, 30));

        setStats((s) => {
          const next = {
            ...s,
            totalRequests: s.totalRequests + Math.floor(Math.random() * 3 + 1),
            bandwidthSavedKb: s.bandwidthSavedKb + Math.floor(Math.random() * 80 + 10),
            adsBlocked: cat.id === "ads" ? s.adsBlocked + 1 : s.adsBlocked,
            trackersBlocked: cat.id === "trackers" ? s.trackersBlocked + 1 : s.trackersBlocked,
          };
          AsyncStorage.setItem(STORAGE_KEYS.stats, JSON.stringify(next)).catch(() => {});
          return next;
        });

        return prev.map((c) => c.id === cat.id ? { ...c, count: c.count + 1 } : c);
      });
    }, 1800 + Math.random() * 2000);

    return () => {
      if (simulationTimer.current) clearInterval(simulationTimer.current);
    };
  }, [enabled]);

  const toggle = useCallback(async () => {
    setEnabled((prev) => {
      const next = !prev;
      AsyncStorage.setItem(STORAGE_KEYS.enabled, String(next)).catch(() => {});
      return next;
    });
  }, []);

  const toggleCategory = useCallback(async (id: string) => {
    setCategories((prev) => {
      const next = prev.map((c) => c.id === id ? { ...c, enabled: !c.enabled } : c);
      AsyncStorage.setItem(STORAGE_KEYS.categories, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const resetStats = useCallback(async () => {
    const fresh: BlockerStats = { adsBlocked: 0, trackersBlocked: 0, bandwidthSavedKb: 0, totalRequests: 0 };
    setStats(fresh);
    setRecentBlocked([]);
    setCategories((prev) => prev.map((c) => ({ ...c, count: 0 })));
    await AsyncStorage.setItem(STORAGE_KEYS.stats, JSON.stringify(fresh)).catch(() => {});
  }, []);

  return (
    <BlockerContext.Provider value={{ enabled, toggle, categories, toggleCategory, stats, recentBlocked, resetStats }}>
      {children}
    </BlockerContext.Provider>
  );
}

export function useBlocker() {
  const ctx = useContext(BlockerContext);
  if (!ctx) throw new Error("useBlocker must be within BlockerProvider");
  return ctx;
}
