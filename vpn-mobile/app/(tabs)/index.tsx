import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useVPN } from "@/context/VPNContext";
import { useColors } from "@/hooks/useColors";
import { countryFlag } from "@/utils/countryFlag";

const RING_SIZE = 220;

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { status, selectedServer, publicIp, connect, disconnect } = useVPN();

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const ringAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (status === "connecting") {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0.95, duration: 700, useNativeDriver: true }),
        ])
      ).start();
      Animated.loop(
        Animated.timing(ringAnim, { toValue: 1, duration: 1800, useNativeDriver: true })
      ).start();
    } else {
      pulseAnim.stopAnimation();
      ringAnim.stopAnimation();
      Animated.spring(pulseAnim, { toValue: 1, useNativeDriver: true }).start();
      Animated.timing(glowAnim, {
        toValue: status === "connected" ? 1 : 0,
        duration: 600,
        useNativeDriver: false,
      }).start();
    }
  }, [status]);

  const statusColor =
    status === "connected"
      ? colors.connected
      : status === "connecting"
      ? colors.connecting
      : colors.disconnected;

  const statusLabel =
    status === "connected"
      ? "DEMO CONNECTED"
      : status === "connecting"
      ? "SIMULATING..."
      : "DEMO DISCONNECTED";

  const glowColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(239,68,68,0.15)", "rgba(34,197,94,0.22)"],
  });

  const handlePress = () => {
    if (status === "disconnected") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      connect();
    } else if (status === "connected") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      disconnect();
    }
  };

  const ringRotate = ringAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topInset + 16, paddingBottom: bottomInset + 90 }]}>
      <Text style={[styles.appTitle, { color: colors.foreground }]}>Veilora</Text>

      <View style={styles.centerArea}>
        <Animated.View
          style={[
            styles.glowRing,
            { width: RING_SIZE + 60, height: RING_SIZE + 60, borderRadius: (RING_SIZE + 60) / 2, backgroundColor: glowColor },
          ]}
        />

        {status === "connecting" && (
          <Animated.View
            style={[
              styles.spinRing,
              { width: RING_SIZE + 20, height: RING_SIZE + 20, borderRadius: (RING_SIZE + 20) / 2, borderColor: colors.connecting, transform: [{ rotate: ringRotate }] },
            ]}
          />
        )}

        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <Pressable
            onPress={handlePress}
            disabled={status === "connecting"}
            style={[
              styles.mainButton,
              {
                width: RING_SIZE,
                height: RING_SIZE,
                borderRadius: RING_SIZE / 2,
                backgroundColor: colors.card,
                borderColor: statusColor,
              },
            ]}
          >
            <Feather
              name="shield"
              size={72}
              color={statusColor}
            />
            <Text style={[styles.powerLabel, { color: statusColor }]}>
              {status === "connected" ? "TAP TO\nDISCONNECT" : status === "connecting" ? "CONNECTING" : "TAP TO\nCONNECT"}
            </Text>
          </Pressable>
        </Animated.View>
      </View>

      <View style={styles.statusArea}>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + "22", borderColor: statusColor + "44" }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>

      <View style={styles.infoCards}>
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="map-pin" size={16} color={colors.mutedForeground} />
          <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>SERVER</Text>
          <Text style={[styles.infoValue, { color: colors.foreground }]} numberOfLines={1}>
            {selectedServer
              ? `${countryFlag(selectedServer.countryShort)} ${selectedServer.countryLong}`
              : "Auto Select"}
          </Text>
        </View>

        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="globe" size={16} color={colors.mutedForeground} />
          <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>YOUR IP</Text>
          <Text style={[styles.infoValue, { color: colors.foreground }]}>
            {status === "connected" && publicIp ? publicIp : "—"}
          </Text>
        </View>
      </View>

      {selectedServer && (
        <View style={styles.serverMeta}>
          <View style={[styles.metaChip, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <Feather name="activity" size={12} color={colors.mutedForeground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{selectedServer.ping} ms</Text>
          </View>
          <View style={[styles.metaChip, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <Feather name="zap" size={12} color={colors.mutedForeground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{selectedServer.speedMbps} Mbps</Text>
          </View>
          <View style={[styles.metaChip, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <Feather name="users" size={12} color={colors.mutedForeground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{selectedServer.sessions} users</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
  },
  appTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.5,
    opacity: 0.5,
    marginBottom: 8,
  },
  centerArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  glowRing: {
    position: "absolute",
    zIndex: 0,
  },
  spinRing: {
    position: "absolute",
    zIndex: 1,
    borderWidth: 2,
    borderTopColor: "transparent",
    borderRightColor: "transparent",
    borderStyle: "solid",
  },
  mainButton: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    gap: 12,
    zIndex: 2,
  },
  powerLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.2,
    textAlign: "center",
  },
  statusArea: {
    marginBottom: 28,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
    borderWidth: 1,
    gap: 8,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
  infoCards: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  infoCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 4,
    alignItems: "flex-start",
  },
  infoLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.2,
    marginTop: 4,
  },
  infoValue: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  serverMeta: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
    borderWidth: 1,
  },
  metaText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
});
