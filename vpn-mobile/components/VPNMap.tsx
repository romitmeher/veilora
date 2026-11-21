import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { SvgXml } from "react-native-svg";

import {
  COUNTRY_PIN_COORDS,
  PROTON_WORLD_SVG_RAW,
} from "@/constants/worldSvg";
import { VPNServer } from "@/context/VPNContext";
import { useColors } from "@/hooks/useColors";

interface VPNMapProps {
  selectedServer: VPNServer | null;
  status: "disconnected" | "connecting" | "connected";
}

export function VPNMap({ selectedServer, status }: VPNMapProps) {
  const colors = useColors();

  // Resolve country code and coordinates
  const countryCode = (selectedServer?.countryShort ?? "US").toUpperCase();
  const pinData = COUNTRY_PIN_COORDS[countryCode] ?? COUNTRY_PIN_COORDS.US;

  // Beacon color matching Proton VPN
  const beaconColor =
    status === "connected"
      ? "#46e3b7"
      : status === "connecting"
      ? "#f59e0b"
      : "#ef4444";

  // Build the official Proton SVG with focused viewBox, highlighted country, and beacon
  const mapSvg = useMemo(() => {
    const pinX = pinData?.x ?? 274.1;
    const pinY = pinData?.y ?? 195.6;
    const targetCountryName = pinData?.name ?? "UnitedStatesofAmerica";

    // Viewport dimensions in SVG coordinates (380 x 340 gives the authentic Proton framing)
    const viewW = 380;
    const viewH = 340;
    const viewBoxX = Math.round(pinX - viewW / 2);
    const viewBoxY = Math.round(pinY - viewH / 2);
    const viewBox = `${viewBoxX} ${viewBoxY} ${viewW} ${viewH}`;

    // Base colors: landmasses in dark slate, borders in subtle charcoal
    let svg = PROTON_WORLD_SVG_RAW.replace(
      /fill="#3F3B4C"/g,
      'fill="#1b1c2b" stroke="#13141f" stroke-width="0.6"'
    );

    // Highlight the active country
    if (targetCountryName) {
      const countryRegex = new RegExp(
        `(<g id="${targetCountryName}"[^>]*>)([\\s\\S]*?)(<\\/g>)`
      );
      svg = svg.replace(countryRegex, (_, open, body, close) => {
        const highlightedBody = body.replace(
          /fill="#1b1c2b"/g,
          'fill="#2e3046" stroke="#181a29" stroke-width="0.8"'
        );
        return `${open}${highlightedBody}${close}`;
      });
    }

    // Set SVG viewBox and dimensions
    svg = svg.replace(
      /<svg[^>]*>/,
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="100%" height="100%">`
    );

    // Concentric Proton radar beacon
    const beaconDefs = `
      <defs>
        <radialGradient id="beaconGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="${beaconColor}" stop-opacity="0.45" />
          <stop offset="45%" stop-color="${beaconColor}" stop-opacity="0.18" />
          <stop offset="100%" stop-color="${beaconColor}" stop-opacity="0" />
        </radialGradient>
      </defs>
    `;

    const beaconElements = `
      ${beaconDefs}
      <g id="radarBeacon">
        <!-- Outer Glowing Aura -->
        <circle cx="${pinX}" cy="${pinY}" r="42" fill="url(#beaconGlow)" />
        <!-- Middle Dark Disc -->
        <circle cx="${pinX}" cy="${pinY}" r="22" fill="#141525" />
        <!-- Inner White Ring -->
        <circle cx="${pinX}" cy="${pinY}" r="11" fill="transparent" stroke="#ffffff" stroke-width="2.5" />
        <!-- Center Solid Dot -->
        <circle cx="${pinX}" cy="${pinY}" r="5.5" fill="${beaconColor}" />
      </g>
    `;

    svg = svg.replace("</svg>", `${beaconElements}</svg>`);

    return svg;
  }, [pinData, status, beaconColor]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SvgXml xml={mapSvg} width="100%" height="100%" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: 350,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
});
