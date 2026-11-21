import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
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
    ? "#22c55e"
    : isConnecting
    ? "#f59e0b"
    : "#ef4444";

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
      {/* Atmospheric top gradient glow */}
      {isConnected && (
        <LinearGradient
          colors={["rgba(34, 197, 94, 0.14)", "transparent"]}
          style={styles.topAura}
          pointerEvents="none"
        />
      )}

      {/* 1. Top Center Status Pill: ONLY Lock/Unlock + Protected / Not Protected */}
      <View style={styles.topStatusContainer}>
        <View style={styles.statusPill}>
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

      {/* 3. Sub-label: "Browsing safely from" outside the pill */}
      <View style={styles.labelSection}>
        <Text style={[styles.subLabel, { color: colors.mutedForeground }]}>
          {locationLabel}
        </Text>
      </View>

      {/* 4. Bottom Elevated Card matching Proton VPN reference */}
      <View style={styles.mainCard}>
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
              <Text style={styles.serverCountryText} numberOfLines={1}>
                {countryTitle}
              </Text>
              <Text style={styles.serverCodeText} numberOfLines={1}>
                {serverCode}
              </Text>
            </View>
          </View>
          <Feather name="chevron-right" size={20} color="#8e92a4" />
        </Pressable>

        {/* Primary Action Button: strictly named "Connect" / "Disconnect", NO internal animations */}
        <Animated.View style={{ transform: [{ scale: buttonPressAnim }] }}>
          <Pressable
            onPress={handleToggle}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={isConnecting}
            style={[
              styles.primaryButton,
              isConnected
                ? styles.disconnectButton
                : isConnecting
                ? styles.connectingButton
                : styles.connectButton,
            ]}
          >
            <Text
              style={[
                styles.primaryButtonText,
                isConnected
                  ? styles.disconnectButtonText
                  : isConnecting
                  ? styles.connectingButtonText
                  : styles.connectButtonText,
              ]}
            >
              {isConnected ? "Disconnect" : isConnecting ? "Connecting..." : "Connect"}
            </Text>
          </Pressable>
        </Animated.View>

        {/* Secondary Action Button: "Change server" */}
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            router.push("/servers");
          }}
          style={({ pressed }) => [
            styles.secondaryButton,
            { opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Text style={styles.secondaryButtonText}>Change server</Text>
        </Pressable>
      </View>

      {/* 5. Live Telemetry metrics */}
      {selectedServer && (
        <View style={styles.telemetryCard}>
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
  topAura: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 120,
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
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  statusIcon: {
    marginRight: 8,
  },
  statusText: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  labelSection: {
    paddingHorizontal: 20,
    marginTop: 6,
    marginBottom: 8,
  },
  subLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  mainCard: {
    marginHorizontal: 16,
    borderRadius: 18,
    padding: 16,
    backgroundColor: "#181926",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#27293d",
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
    fontWeight: "700",
    color: "#f0f0ff",
  },
  serverCodeText: {
    fontSize: 13,
    color: "#8e92a4",
    fontWeight: "500",
  },
  primaryButton: {
    height: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  connectButton: {
    backgroundColor: "#5eead4",
  },
  connectButtonText: {
    color: "#0a0b12",
    fontSize: 16,
    fontWeight: "700",
  },
  disconnectButton: {
    backgroundColor: "#282a3d",
    borderWidth: 1,
    borderColor: "#353852",
  },
  disconnectButtonText: {
    color: "#f0f0ff",
    fontSize: 16,
    fontWeight: "700",
  },
  connectingButton: {
    backgroundColor: "#232536",
  },
  connectingButtonText: {
    color: "#8e92a4",
    fontSize: 16,
    fontWeight: "600",
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1f2133",
    borderWidth: 1,
    borderColor: "#2c2e44",
  },
  secondaryButtonText: {
    color: "#d8d9e6",
    fontSize: 15,
    fontWeight: "600",
  },
  telemetryCard: {
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: "#141523",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#212338",
  },
  telemetryItem: {
    alignItems: "center",
    flex: 1,
  },
  telemetryLabel: {
    fontSize: 11,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  telemetryValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  verticalDivider: {
    width: StyleSheet.hairlineWidth,
    height: 24,
  },
});
