import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { useThemeContext } from '../../theme/ThemeProvider';

interface ThemedViewProps extends ViewProps {
  variant?: 'default' | 'surface' | 'card' | 'elevated';
  padding?: keyof ReturnType<typeof useThemeContext>['theme']['spacing'];
}

export function ThemedView({ variant = 'default', padding, style, ...props }: ThemedViewProps) {
  const { theme } = useThemeContext();
  const { colors, spacing, borderRadius } = theme;

  const variantStyles = {
    default: { backgroundColor: colors.background },
    surface: { backgroundColor: colors.surface },
    card: {
      backgroundColor: colors.card,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    elevated: {
      backgroundColor: colors.card,
      borderRadius: borderRadius.lg,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 1,
      shadowRadius: 8,
      elevation: 3,
    },
  };

  const paddingValue = padding ? spacing[padding] : undefined;

  return (
    <View
      style={[variantStyles[variant], paddingValue !== undefined && { padding: paddingValue }, style]}
      {...props}
    />
  );
}
