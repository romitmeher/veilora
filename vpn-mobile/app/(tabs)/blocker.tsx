import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BlockCategory, useBlocker } from "@/context/BlockerContext";
import { useColors } from "@/hooks/useColors";

function formatBandwidth(kb: number): string {
  if (kb < 1024) return `${kb} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function formatTime(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 5) return "just now";
  if (diff < 60) return `${diff}s ago`;
  return `${Math.floor(diff / 60)}m ago`;
}

function StatCard({ value, label, icon, color, colors }: {
  value: string; label: string; icon: string; color: string; colors: any;
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.statIcon, { backgroundColor: color + "20" }]}>
        <Feather name={icon as any} size={18} color={color} />
      </View>
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

function CategoryRow({ cat, onToggle, colors }: {
  cat: BlockCategory; onToggle: () => void; colors: any;
}) {
  return (
    <Pressable
      onPress={onToggle}
      style={[styles.categoryRow, { borderBottomColor: colors.border }]}
    >
      <View style={[styles.catIcon, { backgroundColor: colors.secondary }]}>
        <Feather name={cat.icon as any} size={15} color={cat.enabled ? colors.primary : colors.mutedForeground} />
      </View>
      <View style={styles.catText}>
        <Text style={[styles.catLabel, { color: colors.foreground }]}>{cat.label}</Text>
        <Text style={[styles.catDesc, { color: colors.mutedForeground }]}>{cat.description}</Text>
      </View>
      <View style={styles.catRight}>
        {cat.count > 0 && (
          <View style={[styles.countBadge, { backgroundColor: colors.primary + "22" }]}>
            <Text style={[styles.countText, { color: colors.primary }]}>{cat.count}</Text>
          </View>
        )}
        <Switch
          value={cat.enabled}
          onValueChange={onToggle}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor="#fff"
        />
      </View>
    </Pressable>
  );
}

const CATEGORY_COLOR: Record<string, string> = {
  ads: "#f59e0b",
  trackers: "#8b5cf6",
  malware: "#ef4444",
  social: "#3b82f6",
  adult: "#ec4899",
};

export default function BlockerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { enabled, toggle, categories, toggleCategory, stats, recentBlocked, resetStats } = useBlocker();

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const totalBlocked = stats.adsBlocked + stats.trackersBlocked +
    categories.filter((c) => !["ads", "trackers"].includes(c.id)).reduce((s, c) => s + c.count, 0);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topInset + 12, paddingBottom: bottomInset + 90 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.foreground }]}>Ad Blocker</Text>
        <Pressable onPress={resetStats} style={styles.resetBtn}>
          <Feather name="rotate-ccw" size={16} color={colors.mutedForeground} />
        </Pressable>
      </View>

      {/* Master toggle */}
      <View style={[styles.masterToggle, { backgroundColor: enabled ? colors.primary + "18" : colors.card, borderColor: enabled ? colors.primary + "40" : colors.border }]}>
        <View style={[styles.masterIcon, { backgroundColor: enabled ? colors.primary : colors.secondary }]}>
          <Feather name="shield" size={22} color={enabled ? "#fff" : colors.mutedForeground} />
        </View>
        <View style={styles.masterText}>
          <Text style={[styles.masterLabel, { color: colors.foreground }]}>
            {enabled ? "Blocking Active" : "Blocking Disabled"}
          </Text>
          <Text style={[styles.masterSub, { color: colors.mutedForeground }]}>
            {enabled ? `${totalBlocked.toLocaleString()} requests blocked` : "Tap to enable ad blocking"}
          </Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            toggle();
          }}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor="#fff"
        />
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <StatCard
          value={stats.adsBlocked.toLocaleString()}
          label="Ads Blocked"
          icon="slash"
          color="#f59e0b"
          colors={colors}
        />
        <StatCard
          value={stats.trackersBlocked.toLocaleString()}
          label="Trackers"
          icon="eye-off"
          color="#8b5cf6"
          colors={colors}
        />
        <StatCard
          value={formatBandwidth(stats.bandwidthSavedKb)}
          label="Saved"
          icon="zap"
          color={colors.connected}
          colors={colors}
        />
      </View>

      {/* Blocklist categories */}
      <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>BLOCKLISTS</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {categories.map((cat, i) => (
          <CategoryRow
            key={cat.id}
            cat={cat}
            onToggle={() => {
              Haptics.selectionAsync();
              toggleCategory(cat.id);
            }}
            colors={colors}
          />
        ))}
      </View>

      {/* Recent blocked */}
      {recentBlocked.length > 0 && (
        <>
          <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>RECENTLY BLOCKED</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {recentBlocked.slice(0, 10).map((entry, i) => (
              <View
                key={entry.id}
                style={[
                  styles.entryRow,
                  { borderBottomColor: colors.border },
                  i === Math.min(recentBlocked.length, 10) - 1 && { borderBottomWidth: 0 },
                ]}
              >
                <View
                  style={[
                    styles.entryDot,
                    { backgroundColor: (CATEGORY_COLOR[entry.category] ?? colors.primary) },
                  ]}
                />
                <Text
                  style={[styles.entryDomain, { color: colors.foreground }]}
                  numberOfLines={1}
                >
                  {entry.domain}
                </Text>
                <Text style={[styles.entryTime, { color: colors.mutedForeground }]}>
                  {formatTime(entry.timestamp)}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}

      {!enabled && recentBlocked.length === 0 && (
        <View style={styles.emptyState}>
          <Feather name="shield-off" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Ad Blocker is Off</Text>
          <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
            Enable the blocker above to start filtering ads, trackers, and malware.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
  },
  resetBtn: {
    padding: 8,
  },
  masterToggle: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 14,
    marginBottom: 16,
  },
  masterIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  masterText: { flex: 1 },
  masterLabel: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  masterSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    alignItems: "center",
    gap: 6,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  statLabel: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  sectionHeader: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.2,
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 8,
  },
  card: {
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  catIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  catText: { flex: 1 },
  catLabel: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  catDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  catRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  countBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 100,
  },
  countText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  entryDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    flexShrink: 0,
  },
  entryDomain: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  entryTime: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    flexShrink: 0,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 40,
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    marginTop: 8,
  },
  emptyDesc: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
});
