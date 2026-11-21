import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CountryFlag } from "@/components/CountryFlag";
import { VPNServer, useVPN } from "@/context/VPNContext";
import { useColors } from "@/hooks/useColors";

function PingBadge({
  ping,
  colors,
}: {
  ping: number;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  const color =
    ping < 50
      ? colors.connected
      : ping < 150
      ? colors.connecting
      : colors.destructive;

  return (
    <View style={[styles.pingBadge, { backgroundColor: color + "18" }]}>
      <Text style={[styles.pingText, { color }]}>{ping} ms</Text>
    </View>
  );
}

function ServerRow({
  server,
  isSelected,
  onPress,
  colors,
}: {
  server: VPNServer;
  isSelected: boolean;
  onPress: () => void;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.serverRow,
        {
          backgroundColor: isSelected ? colors.primary + "12" : colors.card,
          opacity: pressed ? 0.65 : 1,
        },
      ]}
    >
      <CountryFlag
        code={server.countryShort}
        width={32}
        height={22}
        borderRadius={4}
      />

      <View style={styles.serverInfo}>
        <Text
          style={[styles.countryName, { color: colors.foreground }]}
          numberOfLines={1}
        >
          {server.countryLong}
        </Text>
        <Text
          style={[styles.operatorDetail, { color: colors.mutedForeground }]}
          numberOfLines={1}
        >
          {server.operator} · {server.speedMbps} Mbps
        </Text>
      </View>

      <View style={styles.serverRight}>
        <PingBadge ping={server.ping} colors={colors} />
        {isSelected ? (
          <Feather
            name="check"
            size={18}
            color={colors.primary}
            style={styles.checkIcon}
          />
        ) : (
          <View style={styles.checkPlaceholder} />
        )}
      </View>
    </Pressable>
  );
}

export default function ServersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    servers,
    loadingServers,
    selectedServer,
    selectServer,
    connect,
    status,
    refreshServers,
  } = useVPN();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return servers;
    const q = query.toLowerCase();
    return servers.filter(
      (s) =>
        s.countryLong.toLowerCase().includes(q) ||
        s.countryShort.toLowerCase().includes(q) ||
        s.operator.toLowerCase().includes(q) ||
        s.ip.includes(q)
    );
  }, [servers, query]);

  const handleSelect = (server: VPNServer) => {
    Haptics.selectionAsync();
    selectServer(server);
    if (status === "connected") {
      connect(server);
    }
  };

  const topInset = Platform.OS === "web" ? 32 : insets.top;
  const bottomInset = Platform.OS === "web" ? 32 : insets.bottom;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Apple HIG Large Title & Header Bar */}
      <View
        style={[
          styles.headerArea,
          {
            paddingTop: topInset + 16,
          },
        ]}
      >
        <View style={styles.titleRow}>
          <Text style={[styles.largeTitle, { color: colors.foreground }]}>
            Servers
          </Text>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              refreshServers();
            }}
            disabled={loadingServers}
            style={({ pressed }) => [
              styles.refreshButton,
              { opacity: pressed ? 0.6 : 1 },
            ]}
          >
            {loadingServers ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Feather name="refresh-cw" size={19} color={colors.primary} />
            )}
          </Pressable>
        </View>

        {/* Apple HIG Inset Search Bar */}
        <View
          style={[
            styles.searchBar,
            { backgroundColor: colors.secondary },
          ]}
        >
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search by country, operator, or IP..."
            placeholderTextColor={colors.mutedForeground}
            style={[styles.searchInput, { color: colors.foreground }]}
            clearButtonMode="while-editing"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Inset Grouped Server Table */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: bottomInset + 84,
          paddingTop: 8,
        }}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => (
          <View
            style={[
              styles.rowSeparator,
              { backgroundColor: colors.border },
            ]}
          />
        )}
        renderItem={({ item, index }) => {
          const isSelected = selectedServer?.id === item.id;
          const isFirst = index === 0;
          const isLast = index === filtered.length - 1;

          return (
            <View
              style={[
                styles.itemWrapper,
                isFirst && styles.firstItem,
                isLast && styles.lastItem,
                { backgroundColor: colors.card },
              ]}
            >
              <ServerRow
                server={item}
                isSelected={isSelected}
                onPress={() => handleSelect(item)}
                colors={colors}
              />
            </View>
          );
        }}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No servers match your search
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerArea: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  largeTitle: {
    fontSize: 34,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.41,
    lineHeight: 41,
  },
  refreshButton: {
    padding: 6,
  },
  searchBar: {
    height: 38,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    paddingVertical: 0,
  },
  itemWrapper: {
    overflow: "hidden",
  },
  firstItem: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  lastItem: {
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  serverRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  flagEmoji: {
    fontSize: 24,
    marginRight: 14,
  },
  serverInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  countryName: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: -0.32,
  },
  operatorDetail: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
    letterSpacing: -0.08,
  },
  serverRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pingText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    fontVariant: ["tabular-nums"],
  },
  checkIcon: {
    marginLeft: 2,
  },
  checkPlaceholder: {
    width: 20,
  },
  rowSeparator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 54, // Indented hairline so it does not cut the flag
    backgroundColor: "transparent",
  },
  emptyContainer: {
    paddingVertical: 36,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
});
