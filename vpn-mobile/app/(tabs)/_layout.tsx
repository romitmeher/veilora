import { Feather } from "@expo/vector-icons";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";
import { Tabs } from "expo-router";
import React, { useRef } from "react";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

const TAB_CONFIG: Record<
  string,
  { label: string; icon: keyof typeof Feather.glyphMap }
> = {
  index: { label: "VPN", icon: "shield" },
  servers: { label: "Servers", icon: "globe" },
  blocker: { label: "Blocker", icon: "slash" },
  settings: { label: "Settings", icon: "settings" },
};

function AirbnbTabItem({
  route,
  isFocused,
  onPress,
  colors,
}: {
  route: { key: string; name: string };
  isFocused: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const config = TAB_CONFIG[route.name] || {
    label: route.name,
    icon: "circle",
  };

  // Airbnb signature spring scale value
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    // 1. Tactile haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // 2. Airbnb signature spring bounce sequence:
    // Compress down slightly, then spring overshoot and settle
    scaleAnim.setValue(0.82);
    Animated.spring(scaleAnim, {
      toValue: 1,
      mass: 0.6,
      stiffness: 320,
      damping: 11, // Low damping = classic Airbnb lively bounce!
      useNativeDriver: true,
    }).start();

    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      style={styles.tabItem}
    >
      <Animated.View
        style={[
          styles.iconContainer,
          {
            transform: [{ scale: scaleAnim }],
            backgroundColor: isFocused ? colors.primary + "18" : "transparent",
          },
        ]}
      >
        <Feather
          name={config.icon}
          size={20}
          color={isFocused ? colors.primary : colors.mutedForeground}
        />
      </Animated.View>
      <Text
        style={[
          styles.tabLabel,
          {
            color: isFocused ? colors.foreground : colors.mutedForeground,
            fontFamily: isFocused ? "Inter_600SemiBold" : "Inter_400Regular",
          },
        ]}
      >
        {config.label}
      </Text>
    </Pressable>
  );
}

function AirbnbTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const bottomInset = isWeb ? 10 : Math.max(insets.bottom, 10);

  return (
    <View
      style={[
        styles.tabBarContainer,
        {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          paddingBottom: bottomInset,
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <AirbnbTabItem
            key={route.key}
            route={route}
            isFocused={isFocused}
            onPress={onPress}
            colors={colors}
          />
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <AirbnbTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "VPN" }} />
      <Tabs.Screen name="servers" options={{ title: "Servers" }} />
      <Tabs.Screen name="blocker" options={{ title: "Blocker" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: "row",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    elevation: 0,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainer: {
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderRadius: 14,
    marginBottom: 3,
  },
  tabLabel: {
    fontSize: 11,
    letterSpacing: -0.1,
  },
});
