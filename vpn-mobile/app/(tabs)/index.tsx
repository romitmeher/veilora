import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useRef } from "react";
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CountryFlag } from "@/components/CountryFlag";
import { VPNMap } from "@/components/VPNMap";
import { useVPN } from "@/context/VPNContext";
import { useColors } from "@/hooks/useColors";

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { status, selectedServer, connect, disconnect } = useVPN();

  const buttonPressAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(buttonPressAnim, {
      toValue: 0.97,
      mass: 0.6,
      stiffness: 350,
      damping: 24,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(buttonPressAnim, {
      toValue: 1,
      mass: 0.6,
      stiffness: 350,
      damping: 24,
      useNativeDriver: true,
    }).start();
  };

  const handleToggle = () => {
    if (status === "disconnected") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      connect();
    } else if (status === "connected") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      disconnect();
    }
  };

  const isConnected = status === "connected";
  const isConnecting = status === "connecting";

  const statusColor = isConnected
    ? colors.connected
    : isConnecting
    ? colors.connecting
    : colors.disconnected;

  const topInset = Platform.OS === "web" ? 20 : insets.top;
  const bottomInset = Platform.OS === "web" ? 28 : insets.bottom;

  // Country and server details for the card
  const countryTitle = selectedServer
    ? selectedServer.countryLong
    : "Fastest country";
  const serverCode = selectedServer
    ? selectedServer.hostName
      ? selectedServer.hostName.split(".")[0].toUpperCase()
      : selectedServer.ip
    : "US-FREE#114";

  // Label text above the card
  const locationLabel = isConnected
    ? "Browsing safely from"
    : isConnecting
    ? "Connecting to"
    : "Browsing safely from";

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{
        paddingTop: topInset + 10,
        paddingBottom: bottomInset + 88,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Top Center Status Pill: Lock/Unlock + Status */}
      <View style={styles.topStatusContainer}>
        <View style={[styles.statusPill, { backgroundColor: colors.card }]}>
          <Feather
            name={isConnected ? "lock" : isConnecting ? "lock" : "unlock"}
            size={18}
            color={statusColor}
            style={styles.statusIcon}
          />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {isConnected
              ? "Protected"
              : isConnecting
              ? "Connecting..."
              : "Not Protected"}
          </Text>
        </View>
      </View>

      {/* 2. Official Proton Skeleton World Map */}
      <VPNMap selectedServer={selectedServer} status={status} />

      {/* 3. Sub-label: "Browsing safely from" */}
      <View style={styles.labelSection}>
        <Text style={[styles.subLabel, { color: colors.mutedForeground }]}>
          {locationLabel}
        </Text>
      </View>

      {/* 4. Bottom Elevated Card matching Apple HIG / Proton layout (No borders) */}
      <View style={[styles.mainCard, { backgroundColor: colors.card }]}>
        {/* Country & Server Selector Row */}
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            router.push("/servers");
          }}
          style={({ pressed }) => [
            styles.serverRow,
            { opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <View style={styles.serverRowLeft}>
            <CountryFlag
              code={selectedServer?.countryShort ?? "US"}
              width={32}
              height={22}
              borderRadius={4}
            />
            <View style={styles.serverTextColumn}>
              <Text
                style={[styles.serverCountryText, { color: colors.foreground }]}
                numberOfLines={1}
              >
                {countryTitle}
              </Text>
              <Text
                style={[styles.serverCodeText, { color: colors.mutedForeground }]}
                numberOfLines={1}
              >
                {serverCode}
              </Text>
            </View>
          </View>
          <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
        </Pressable>

        {/* Primary Action Button: "Connect" / "Disconnect" (No borders) */}
        <Animated.View style={{ transform: [{ scale: buttonPressAnim }] }}>
          <Pressable
            onPress={handleToggle}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={isConnecting}
            style={[
              styles.primaryButton,
              {
                backgroundColor: isConnected
                  ? colors.secondary
                  : isConnecting
                  ? colors.secondary
                  : colors.primary,
              },
            ]}
          >
            <Text
              style={[
                styles.primaryButtonText,
                {
                  color: isConnected
                    ? colors.foreground
                    : isConnecting
                    ? colors.mutedForeground
                    : colors.primaryForeground,
                },
              ]}
            >
              {isConnected ? "Disconnect" : isConnecting ? "Connecting..." : "Connect"}
            </Text>
          </Pressable>
        </Animated.View>

        {/* Secondary Action Button: "Change server" (No borders) */}
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            router.push("/servers");
          }}
          style={({ pressed }) => [
            styles.secondaryButton,
            { backgroundColor: colors.secondary, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Text
            style={[styles.secondaryButtonText, { color: colors.foreground }]}
          >
            Change server
          </Text>
        </Pressable>
      </View>

      {/* 5. Live Telemetry metrics (No borders) */}
      {selectedServer && (
        <View style={[styles.telemetryCard, { backgroundColor: colors.card }]}>
          <View style={styles.telemetryItem}>
            <Text style={[styles.telemetryLabel, { color: colors.mutedForeground }]}>
              Ping
            </Text>
            <Text style={[styles.telemetryValue, { color: colors.foreground }]}>
              {selectedServer.ping} ms
            </Text>
          </View>
          <View style={[styles.verticalDivider, { backgroundColor: colors.border }]} />
          <View style={styles.telemetryItem}>
            <Text style={[styles.telemetryLabel, { color: colors.mutedForeground }]}>
              Speed
            </Text>
            <Text style={[styles.telemetryValue, { color: colors.foreground }]}>
              {selectedServer.speedMbps} Mbps
            </Text>
          </View>
          <View style={[styles.verticalDivider, { backgroundColor: colors.border }]} />
          <View style={styles.telemetryItem}>
            <Text style={[styles.telemetryLabel, { color: colors.mutedForeground }]}>
              Sessions
            </Text>
            <Text style={[styles.telemetryValue, { color: colors.foreground }]}>
              {selectedServer.sessions}
            </Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topStatusContainer: {
    alignItems: "center",
    marginBottom: 6,
    paddingHorizontal: 20,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 24,
  },
  statusIcon: {
    marginRight: 8,
  },
  statusText: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.2,
  },
  labelSection: {
    paddingHorizontal: 20,
    marginTop: 6,
    marginBottom: 8,
  },
  subLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    letterSpacing: -0.08,
  },
  mainCard: {
    marginHorizontal: 16,
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },
  serverRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  serverRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  serverTextColumn: {
    gap: 2,
  },
  serverCountryText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: -0.32,
  },
  serverCodeText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    letterSpacing: -0.08,
  },
  primaryButton: {
    height: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  secondaryButton: {
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  telemetryCard: {
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  telemetryItem: {
    alignItems: "center",
    flex: 1,
  },
  telemetryLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  telemetryValue: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    fontVariant: ["tabular-nums"],
  },
  verticalDivider: {
    width: StyleSheet.hairlineWidth,
    height: 24,
  },
});
