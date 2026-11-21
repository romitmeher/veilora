import React, { useEffect, useRef } from "react";
import { Animated, StyleProp, StyleSheet, Text, TextStyle, View } from "react-native";

interface MorphTextProps {
  text: string;
  style?: StyleProp<TextStyle>;
}

/**
 * MorphText implements the Torph animation concept for React Native.
 * Smoothly morphs status text and telemetry strings with subtle vertical slide
 * and opacity transitions, preventing layout jumps.
 */
export function MorphText({ text, style }: MorphTextProps) {
  const currentTextRef = useRef(text);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (text !== currentTextRef.current) {
      // Animate out: slight slide up and fade
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -4,
          duration: 120,
          useNativeDriver: true,
        }),
      ]).start(() => {
        currentTextRef.current = text;
        slideAnim.setValue(4);
        // Animate in: slide up from bottom to 0 and fade in
        Animated.parallel([
          Animated.spring(fadeAnim, {
            toValue: 1,
            mass: 0.8,
            stiffness: 280,
            damping: 24,
            useNativeDriver: true,
          }),
          Animated.spring(slideAnim, {
            toValue: 0,
            mass: 0.8,
            stiffness: 280,
            damping: 24,
            useNativeDriver: true,
          }),
        ]).start();
      });
    }
  }, [text]);

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
    >
      <Text style={style}>{currentTextRef.current}</Text>
    </Animated.View>
  );
}
