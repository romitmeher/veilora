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
  { value: "openvpn-udp", label: "OpenVPN UDP", desc: "Fastest, best for most cases" },
  { value: "openvpn-tcp", label: "OpenVPN TCP", desc: "Reliable, works through firewalls" },
  { value: "softether", label: "SoftEther", desc: "High speed, NAT traversal" },
];

function SectionHeader({ label, colors }: { label: string; colors: any }) {
  return (
    <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>{label}</Text>
  );
}

function SettingRow({ icon, label, sublabel, right, colors, onPress }: {
  icon: string; label: string; sublabel?: string; right: React.ReactNode; colors: any; onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.settingRow, { borderBottomColor: colors.border }]}
    >
      <View style={[styles.iconBox, { backgroundColor: colors.secondary }]}>
        <Feather name={icon as any} size={16} color={colors.primary} />
      </View>
      <View style={styles.settingText}>
        <Text style={[styles.settingLabel, { color: colors.foreground }]}>{label}</Text>
        {sublabel ? (
          <Text style={[styles.settingSubLabel, { color: colors.mutedForeground }]}>{sublabel}</Text>
        ) : null}
      </View>
      {right}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings, updateSettings } = useVPN();

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const toggle = (key: "killSwitch" | "autoConnect" | "customDns") => {
    Haptics.selectionAsync();
    updateSettings({ [key]: !settings[key] });
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topInset + 12, paddingBottom: bottomInset + 90 }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.title, { color: colors.foreground }]}>Settings</Text>

      <SectionHeader label="PROTOCOL" colors={colors} />
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {PROTOCOLS.map((p, i) => (
          <Pressable
            key={p.value}
            onPress={() => {
              Haptics.selectionAsync();
              updateSettings({ protocol: p.value });
            }}
            style={[
              styles.protocolRow,
              { borderBottomColor: colors.border },
              i === PROTOCOLS.length - 1 && { borderBottomWidth: 0 },
            ]}
          >
            <View style={styles.protocolText}>
              <Text style={[styles.protocolLabel, { color: colors.foreground }]}>{p.label}</Text>
              <Text style={[styles.protocolDesc, { color: colors.mutedForeground }]}>{p.desc}</Text>
            </View>
            <View
              style={[
                styles.radioOuter,
                { borderColor: settings.protocol === p.value ? colors.primary : colors.border },
              ]}
            >
              {settings.protocol === p.value && (
                <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />
              )}
            </View>
          </Pressable>
        ))}
      </View>

      <SectionHeader label="SECURITY" colors={colors} />
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <SettingRow
          icon="shield"
          label="Kill Switch"
          sublabel="Block internet if VPN drops"
          colors={colors}
          right={
            <Switch
              value={settings.killSwitch}
              onValueChange={() => toggle("killSwitch")}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          }
        />
        <SettingRow
          icon="zap"
          label="Auto-Connect"
          sublabel="Connect on app launch"
          colors={colors}
          right={
            <Switch
              value={settings.autoConnect}
              onValueChange={() => toggle("autoConnect")}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          }
        />
      </View>

      <SectionHeader label="DNS" colors={colors} />
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <SettingRow
          icon="server"
          label="Custom DNS"
          sublabel="Override default DNS server"
          colors={colors}
          right={
            <Switch
              value={settings.customDns}
              onValueChange={() => toggle("customDns")}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          }
        />
        {settings.customDns && (
          <View style={[styles.dnsRow, { borderTopColor: colors.border }]}>
            <Feather name="hash" size={14} color={colors.mutedForeground} />
            <TextInput
              value={settings.dnsServer}
              onChangeText={(v) => updateSettings({ dnsServer: v })}
              placeholder="e.g. 1.1.1.1"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="decimal-pad"
              style={[styles.dnsInput, { color: colors.foreground }]}
            />
          </View>
        )}
      </View>

      <SectionHeader label="ABOUT" colors={colors} />
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <SettingRow
          icon="info"
          label="Version"
          colors={colors}
          right={<Text style={[styles.aboutVal, { color: colors.mutedForeground }]}>1.0.0</Text>}
        />
        <SettingRow
          icon="globe"
          label="VPN Servers"
          sublabel="Powered by VPNGate"
          colors={colors}
          right={<Feather name="external-link" size={16} color={colors.mutedForeground} />}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  sectionHeader: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.2,
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 8,
  },
  card: {
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  settingText: { flex: 1 },
  settingLabel: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  settingSubLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  protocolRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  protocolText: { flex: 1 },
  protocolLabel: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  protocolDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dnsRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  dnsInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    padding: 0,
  },
  aboutVal: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
});
