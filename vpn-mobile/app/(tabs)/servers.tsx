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

import { VPNServer, useVPN } from "@/context/VPNContext";
import { useColors } from "@/hooks/useColors";
import { countryFlag } from "@/utils/countryFlag";

function PingBadge({ ping, colors }: { ping: number; colors: ReturnType<typeof import("@/hooks/useColors").useColors> }) {
  const color = ping < 50 ? colors.connected : ping < 150 ? colors.connecting : colors.destructive;
  return (
    <View style={[styles.badge, { backgroundColor: color + "22" }]}>
      <Text style={[styles.badgeText, { color }]}>{ping}ms</Text>
    </View>
  );
}

function ServerRow({ server, isSelected, onPress, colors }: {
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
          backgroundColor: isSelected ? colors.primary + "15" : colors.card,
          borderColor: isSelected ? colors.primary : colors.border,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      <Text style={styles.flag}>{countryFlag(server.countryShort)}</Text>
      <View style={styles.serverInfo}>
        <Text style={[styles.serverCountry, { color: colors.foreground }]} numberOfLines={1}>
          {server.countryLong}
        </Text>
        <Text style={[styles.serverOp, { color: colors.mutedForeground }]} numberOfLines={1}>
          {server.operator} · {server.speedMbps} Mbps
        </Text>
      </View>
      <PingBadge ping={server.ping} colors={colors} />
      {isSelected && (
        <Feather name="check-circle" size={18} color={colors.primary} style={{ marginLeft: 6 }} />
      )}
    </Pressable>
  );
}

export default function ServersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { servers, loadingServers, selectedServer, selectServer, connect, status, refreshServers } = useVPN();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return servers;
    const q = query.toLowerCase();
    return servers.filter(
      (s) =>
        s.countryLong.toLowerCase().includes(q) ||
        s.countryShort.toLowerCase().includes(q) ||
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

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topInset + 12, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Servers</Text>
        <Pressable onPress={refreshServers} disabled={loadingServers} style={styles.refreshBtn}>
          {loadingServers
            ? <ActivityIndicator size="small" color={colors.primary} />
            : <Feather name="refresh-cw" size={20} color={colors.primary} />
          }
        </Pressable>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search country or IP…"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.searchInput, { color: colors.foreground }]}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")}>
              <Feather name="x" size={15} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      </View>

      {loadingServers && servers.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            Fetching VPN servers…
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ServerRow
              server={item}
              isSelected={selectedServer?.id === item.id}
              onPress={() => handleSelect(item)}
              colors={colors}
            />
          )}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: bottomInset + 90 },
          ]}
          scrollEnabled={filtered.length > 0}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="globe" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No servers found
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
  },
  refreshBtn: {
    padding: 6,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    padding: 0,
  },
  list: {
    padding: 16,
    gap: 8,
  },
  serverRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  flag: {
    fontSize: 28,
  },
  serverInfo: {
    flex: 1,
    gap: 3,
  },
  serverCountry: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  serverOp: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  empty: {
    alignItems: "center",
    paddingTop: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
});
