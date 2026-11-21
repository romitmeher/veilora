import { Image } from "expo-image";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

interface CountryFlagProps {
  code: string;
  width?: number;
  height?: number;
  borderRadius?: number;
}

/**
 * CountryFlag renders high-resolution actual country flags instead of Unicode emojis.
 * Uses FlagCDN vector/raster assets with expo-image hardware acceleration and caching.
 */
export function CountryFlag({
  code,
  width = 28,
  height = 20,
  borderRadius = 4,
}: CountryFlagProps) {
  const colors = useColors();
  const cleanCode = (code || "un").toLowerCase().trim();

  // If code is empty or invalid
  if (!cleanCode || cleanCode.length !== 2) {
    return (
      <View
        style={[
          styles.fallback,
          {
            width,
            height,
            borderRadius,
            backgroundColor: colors.secondary,
            borderColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.fallbackText, { color: colors.mutedForeground }]}>
          {cleanCode.toUpperCase() || "—"}
        </Text>
      </View>
    );
  }

  const flagUri = `https://flagcdn.com/w80/${cleanCode}.png`;

  return (
    <View
      style={[
        styles.wrapper,
        {
          width,
          height,
          borderRadius,
          borderColor: colors.border,
        },
      ]}
    >
      <Image
        source={{ uri: flagUri }}
        style={{ width, height, borderRadius }}
        contentFit="cover"
        transition={150}
        cachePolicy="memory-disk"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
    alignItems: "center",
  },
  fallback: {
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
    alignItems: "center",
  },
  fallbackText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
  },
});
