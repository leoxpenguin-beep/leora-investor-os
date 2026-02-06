import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";

import { theme } from "../theme/theme";

type GravityDotProps = {
  size?: number;
  style?: StyleProp<ViewStyle>;
};

export function GravityDot({ size = 10, style }: GravityDotProps) {
  return (
    <View
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: theme.colors.accentSoft,
    borderWidth: 1,
    borderColor: theme.colors.accent,
  },
});
