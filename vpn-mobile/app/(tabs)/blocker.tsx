import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import {
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

function formatRelativeTime(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 5) return "just now";
  if (diff < 60) return `${diff}s ago`;
  return `${Math.floor(diff / 60)}m ago`;
}

const CATEGORY_COLORS: Record<string, string> = {
  ads: "#f59e0b",
  trackers: "#8b5cf6",
  malware: "#ef4444",
  social: "#3b82f6",
  adult: "#ec4899",
};

export default function BlockerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { enabled, toggle, categories, toggleCategory, stats, recentBlocked, resetStats, openDnsSettings, testProtection, dnsHost } = useBlocker();

  const topInset = Platform.OS === "web" ? 32 : insets.top;
  const bottomInset = Platform.OS === "web" ? 32 : insets.bottom;

  const handleMasterToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    toggle();
  };

  const handleCategoryToggle = (id: string) => {
    Haptics.selectionAsync();
    toggleCategory(id);
  };

  const handleReset = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    resetStats();
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{
        paddingTop: topInset + 16,
        paddingBottom: bottomInset + 84,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Apple HIG Large Title Navigation Bar */}
      <View style={styles.headerArea}>
        <Text style={[styles.largeTitle, { color: colors.foreground }]}>Ad Blocker</Text>
        <Text style={[styles.subheadline, { color: colors.mutedForeground }]}>
          Filter subscriptions and network shields
        </Text>
      </View>

      {/* Master Protection Card (Inset Grouped) */}
      <View style={[styles.masterCard, { backgroundColor: colors.card }]}>
        <View style={styles.masterTopRow}>
          <View style={styles.masterLeft}>
            <View
              style={[
                styles.iconBadge,
                { backgroundColor: enabled ? colors.primary + "18" : colors.secondary },
              ]}
            >
              <Feather
                name={enabled ? "shield" : "shield-off"}
                size={20}
                color={enabled ? colors.primary : colors.mutedForeground}
              />
            </View>
            <View style={styles.masterTitles}>
              <Text style={[styles.rowTitle, { color: colors.foreground }]}>
                Content Filtering
              </Text>
              <Text style={[styles.rowSubtitle, { color: colors.mutedForeground }]}>
                {enabled ? "Active and protecting connections" : "Filtering disabled"}
              </Text>
            </View>
          </View>
          <Switch
            value={enabled}
            onValueChange={handleMasterToggle}
            trackColor={{ false: colors.secondary, true: colors.primary }}
            thumbColor="#ffffff"
          />
        </View>

        <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />

        {/* 3-Column Metrics Row */}
        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>
              Ads Blocked
            </Text>
            <Text style={[styles.metricValue, { color: colors.foreground }]}>
              {stats.adsBlocked.toLocaleString()}
            </Text>
          </View>
          <View style={[styles.metricDivider, { backgroundColor: colors.border }]} />
          <View style={styles.metricItem}>
            <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>
              Trackers
            </Text>
            <Text style={[styles.metricValue, { color: colors.foreground }]}>
              {stats.trackersBlocked.toLocaleString()}
            </Text>
          </View>
          <View style={[styles.metricDivider, { backgroundColor: colors.border }]} />
          <View style={styles.metricItem}>
            <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>
              Data Saved
            </Text>
            <Text style={[styles.metricValue, { color: colors.foreground }]}>
              {formatBandwidth(stats.bandwidthSavedKb)}
            </Text>
          </View>
        </View>
      </View>

      {/* Private DNS Setup Card */}
      <View style={[styles.masterCard, { backgroundColor: colors.card, marginBottom: 20 }]}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Feather name="globe" size={18} color={colors.primary} />
            <Text style={[styles.rowTitle, { color: colors.foreground }]}>Private DNS Provider</Text>
          </View>
          <Text style={{ fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_500Medium" }}>{dnsHost}</Text>
        </View>
        <Text style={[styles.rowSubtitle, { color: colors.mutedForeground, marginBottom: 12 }]}>
          System-wide ad & tracker blocking for all apps via Android encrypted DNS.
        </Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              openDnsSettings();
            }}
            style={({ pressed }) => [
              {
                flex: 1,
                backgroundColor: colors.primary,
                paddingVertical: 10,
                borderRadius: 10,
                alignItems: "center",
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Text style={{ color: "#ffffff", fontFamily: "Inter_600SemiBold", fontSize: 13 }}>Configure DNS</Text>
          </Pressable>
          <Pressable
            onPress={async () => {
              Haptics.selectionAsync();
              const blocked = await testProtection();
              Haptics.notificationAsync(
                blocked ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning
              );
            }}
            style={({ pressed }) => [
              {
                flex: 1,
                backgroundColor: colors.secondary,
                paddingVertical: 10,
                borderRadius: 10,
                alignItems: "center",
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>Test Shield</Text>
          </Pressable>
        </View>
      </View>

      {/* Section: Categories */}
      <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>
        FILTER CATEGORIES
      </Text>
      <View style={[styles.groupedCard, { backgroundColor: colors.card }]}>
        {categories.map((cat, index) => {
          const catColor = CATEGORY_COLORS[cat.id] || colors.primary;
          const isLast = index === categories.length - 1;

          return (
            <React.Fragment key={cat.id}>
              <View style={styles.categoryRow}>
                <View
                  style={[
                    styles.iconBadge,
                    { backgroundColor: cat.enabled ? catColor + "18" : colors.secondary },
                  ]}
                >
                  <Feather
                    name={cat.icon as any}
                    size={17}
                    color={cat.enabled ? catColor : colors.mutedForeground}
                  />
                </View>

                <View style={styles.categoryInfo}>
                  <Text style={[styles.rowTitle, { color: colors.foreground }]}>
                    {cat.label}
                  </Text>
                  <Text
                    style={[styles.rowSubtitle, { color: colors.mutedForeground }]}
                    numberOfLines={1}
                  >
                    {cat.description}
                  </Text>
                </View>

                <View style={styles.categoryRight}>
                  {cat.count > 0 && (
                    <View style={[styles.countBadge, { backgroundColor: colors.secondary }]}>
                      <Text style={[styles.countText, { color: colors.mutedForeground }]}>
                        {cat.count}
                      </Text>
                    </View>
                  )}
                  <Switch
                    value={cat.enabled}
                    onValueChange={() => handleCategoryToggle(cat.id)}
                    trackColor={{ false: colors.secondary, true: colors.primary }}
                    thumbColor="#ffffff"
                  />
                </View>
              </View>

              {!isLast && (
                <View
                  style={[
                    styles.indentedDivider,
                    { backgroundColor: colors.border },
                  ]}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>

      {/* Section: Activity Stream */}
      <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>
        RECENT ACTIVITY
      </Text>
      <View style={[styles.groupedCard, { backgroundColor: colors.card }]}>
        {recentBlocked.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No domains blocked yet
            </Text>
          </View>
        ) : (
          recentBlocked.slice(0, 5).map((item, index) => {
            const isLast = index === Math.min(recentBlocked.length, 5) - 1;
            return (
              <React.Fragment key={item.id}>
                <View style={styles.activityRow}>
                  <View style={styles.activityInfo}>
                    <Text
                      style={[styles.domainText, { color: colors.foreground }]}
                      numberOfLines={1}
                    >
                      {item.domain}
                    </Text>
                    <Text style={[styles.timeText, { color: colors.mutedForeground }]}>
                      {formatRelativeTime(item.timestamp)}
                    </Text>
                  </View>
                  <View style={[styles.activityBadge, { backgroundColor: colors.secondary }]}>
                    <Text style={[styles.activityBadgeText, { color: colors.mutedForeground }]}>
                      {item.category}
                    </Text>
                  </View>
                </View>
                {!isLast && (
                  <View
                    style={[
                      styles.plainDivider,
                      { backgroundColor: colors.border },
                    ]}
                  />
                )}
              </React.Fragment>
            );
          })
        )}
      </View>

      {/* Reset Stats Action */}
      <View style={styles.resetContainer}>
        <Pressable
          onPress={handleReset}
          style={({ pressed }) => [
            styles.resetButton,
            { opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <Text style={[styles.resetText, { color: colors.destructive }]}>
            Reset Statistics
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerArea: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  largeTitle: {
    fontSize: 34,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.41,
    lineHeight: 41,
  },
  subheadline: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
    letterSpacing: -0.24,
  },
  masterCard: {
    marginHorizontal: 16,
    borderRadius: 18,
    padding: 16,
    marginBottom: 28,
  },
  masterTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  masterLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    marginRight: 12,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  masterTitles: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: -0.32,
  },
  rowSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
    letterSpacing: -0.08,
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 14,
  },
  metricsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metricItem: {
    flex: 1,
    alignItems: "center",
  },
  metricLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  metricValue: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    fontVariant: ["tabular-nums"],
  },
  metricDivider: {
    width: StyleSheet.hairlineWidth,
    height: 24,
  },
  sectionHeader: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.6,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  groupedCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 24,
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  categoryInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  categoryRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  countText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    fontVariant: ["tabular-nums"],
  },
  indentedDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 60, // 16 padding + 32 badge + 12 gap = 60pt indented hairline
  },
  plainDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 16,
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  activityInfo: {
    flex: 1,
    marginRight: 12,
  },
  domainText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    letterSpacing: -0.2,
  },
  timeText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  activityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activityBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    textTransform: "capitalize",
  },
  emptyContainer: {
    paddingVertical: 24,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  resetContainer: {
    alignItems: "center",
    paddingVertical: 12,
  },
  resetButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  resetText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
});
