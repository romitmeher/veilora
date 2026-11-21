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
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { VPNProtocol, useVPN } from "@/context/VPNContext";
import { useColors } from "@/hooks/useColors";

const PROTOCOLS: { value: VPNProtocol; label: string; desc: string }[] = [
  { value: "openvpn-udp", label: "OpenVPN UDP", desc: "Fastest performance, ideal for general browsing" },
  { value: "openvpn-tcp", label: "OpenVPN TCP", desc: "Reliable fallback, bypasses restrictive firewalls" },
  { value: "softether", label: "SoftEther", desc: "High-throughput protocol with NAT traversal" },
];

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings, updateSettings } = useVPN();

  const topInset = Platform.OS === "web" ? 32 : insets.top;
  const bottomInset = Platform.OS === "web" ? 32 : insets.bottom;

  const handleToggle = (key: "killSwitch" | "autoConnect" | "customDns") => {
    Haptics.selectionAsync();
    updateSettings({ [key]: !settings[key] });
  };

  const handleSelectProtocol = (protocol: VPNProtocol) => {
    Haptics.selectionAsync();
    updateSettings({ protocol });
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
      {/* Apple HIG Large Title */}
      <View style={styles.headerArea}>
        <Text style={[styles.largeTitle, { color: colors.foreground }]}>Settings</Text>
        <Text style={[styles.subheadline, { color: colors.mutedForeground }]}>
          Preferences and network protocols
        </Text>
      </View>

      {/* Section: Protocol */}
      <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>
        PROTOCOL
      </Text>
      <View style={[styles.groupedCard, { backgroundColor: colors.card }]}>
        {PROTOCOLS.map((p, index) => {
          const isSelected = settings.protocol === p.value;
          const isLast = index === PROTOCOLS.length - 1;

          return (
            <React.Fragment key={p.value}>
              <Pressable
                onPress={() => handleSelectProtocol(p.value)}
                style={({ pressed }) => [
                  styles.protocolRow,
                  { opacity: pressed ? 0.65 : 1 },
                ]}
              >
                <View style={styles.protocolInfo}>
                  <Text style={[styles.rowTitle, { color: colors.foreground }]}>
                    {p.label}
                  </Text>
                  <Text style={[styles.rowSubtitle, { color: colors.mutedForeground }]}>
                    {p.desc}
                  </Text>
                </View>
                {isSelected && (
                  <Feather name="check" size={19} color={colors.primary} />
                )}
              </Pressable>
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
        })}
      </View>

      {/* Section: Connection & Security */}
      <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>
        SECURITY & TUNNEL
      </Text>
      <View style={[styles.groupedCard, { backgroundColor: colors.card }]}>
        {/* Kill Switch */}
        <View style={styles.settingRow}>
          <View
            style={[
              styles.iconBadge,
              { backgroundColor: settings.killSwitch ? colors.primary + "18" : colors.secondary },
            ]}
          >
            <Feather
              name="lock"
              size={17}
              color={settings.killSwitch ? colors.primary : colors.mutedForeground}
            />
          </View>
          <View style={styles.settingInfo}>
            <Text style={[styles.rowTitle, { color: colors.foreground }]}>
              Kill Switch
            </Text>
            <Text style={[styles.rowSubtitle, { color: colors.mutedForeground }]}>
              Block non-VPN traffic on disconnect
            </Text>
          </View>
          <Switch
            value={settings.killSwitch}
            onValueChange={() => handleToggle("killSwitch")}
            trackColor={{ false: colors.secondary, true: colors.primary }}
            thumbColor="#ffffff"
          />
        </View>

        <View style={[styles.indentedDivider, { backgroundColor: colors.border }]} />

        {/* Auto Connect */}
        <View style={styles.settingRow}>
          <View
            style={[
              styles.iconBadge,
              { backgroundColor: settings.autoConnect ? colors.primary + "18" : colors.secondary },
            ]}
          >
            <Feather
              name="zap"
              size={17}
              color={settings.autoConnect ? colors.primary : colors.mutedForeground}
            />
          </View>
          <View style={styles.settingInfo}>
            <Text style={[styles.rowTitle, { color: colors.foreground }]}>
              Auto Connect
            </Text>
            <Text style={[styles.rowSubtitle, { color: colors.mutedForeground }]}>
              Connect automatically on app launch
            </Text>
          </View>
          <Switch
            value={settings.autoConnect}
            onValueChange={() => handleToggle("autoConnect")}
            trackColor={{ false: colors.secondary, true: colors.primary }}
            thumbColor="#ffffff"
          />
        </View>

        <View style={[styles.indentedDivider, { backgroundColor: colors.border }]} />

        {/* Custom DNS */}
        <View style={styles.settingRow}>
          <View
            style={[
              styles.iconBadge,
              { backgroundColor: settings.customDns ? colors.primary + "18" : colors.secondary },
            ]}
          >
            <Feather
              name="globe"
              size={17}
              color={settings.customDns ? colors.primary : colors.mutedForeground}
            />
          </View>
          <View style={styles.settingInfo}>
            <Text style={[styles.rowTitle, { color: colors.foreground }]}>
              Custom DNS
            </Text>
            <Text style={[styles.rowSubtitle, { color: colors.mutedForeground }]}>
              Use a dedicated secure DNS resolver
            </Text>
          </View>
          <Switch
            value={settings.customDns}
            onValueChange={() => handleToggle("customDns")}
            trackColor={{ false: colors.secondary, true: colors.primary }}
            thumbColor="#ffffff"
          />
        </View>
      </View>

      {/* Custom DNS Server Input (when enabled) */}
      {settings.customDns && (
        <>
          <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>
            DNS RESOLVER ADDRESS
          </Text>
          <View style={[styles.groupedCard, { backgroundColor: colors.card }]}>
            <View style={styles.inputRow}>
              <TextInput
                value={settings.dnsServer}
                onChangeText={(text) => updateSettings({ dnsServer: text })}
                placeholder="1.1.1.1"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numeric"
                style={[
                  styles.dnsInput,
                  { color: colors.foreground },
                ]}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>
        </>
      )}

      {/* Section: About & Info */}
      <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>
        ABOUT
      </Text>
      <View style={[styles.groupedCard, { backgroundColor: colors.card }]}>
        <View style={styles.aboutRow}>
          <Text style={[styles.rowTitle, { color: colors.foreground }]}>
            Application Version
          </Text>
          <Text style={[styles.aboutValue, { color: colors.mutedForeground }]}>
            1.0.0 (Mobile Prototype)
          </Text>
        </View>
        <View style={[styles.plainDivider, { backgroundColor: colors.border }]} />
        <View style={styles.aboutRow}>
          <Text style={[styles.rowTitle, { color: colors.foreground }]}>
            Desktop Engine
          </Text>
          <Text style={[styles.aboutValue, { color: colors.mutedForeground }]}>
            Go 1.26 / Wails v2.11
          </Text>
        </View>
        <View style={[styles.plainDivider, { backgroundColor: colors.border }]} />
        <View style={styles.aboutRow}>
          <Text style={[styles.rowTitle, { color: colors.foreground }]}>
            License
          </Text>
          <Text style={[styles.aboutValue, { color: colors.mutedForeground }]}>
            MIT Open Source
          </Text>
        </View>
      </View>

      {/* Footer Footnote */}
      <Text style={[styles.footerFootnote, { color: colors.mutedForeground }]}>
        Veilora is an open-source privacy suite. Configured with Apple Human Interface Guidelines ergonomics.
      </Text>
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
  protocolRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  protocolInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  settingInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
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
  indentedDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 60, // 16 margin + 32 badge + 12 gap = 60pt indented hairline
  },
  plainDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 16,
  },
  inputRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  dnsInput: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    fontVariant: ["tabular-nums"],
    paddingVertical: 4,
  },
  aboutRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  aboutValue: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  footerFootnote: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
    paddingHorizontal: 20,
    textAlign: "center",
    marginTop: 4,
  },
});
