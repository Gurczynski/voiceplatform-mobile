import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { useThemeContext } from '../../theme/ThemeProvider';

interface ThemedButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export function ThemedButton({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  fullWidth = true,
}: ThemedButtonProps) {
  const { theme } = useThemeContext();
  const { colors, spacing, borderRadius, fontSize } = theme;

  const sizeStyles = {
    sm: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, fontSize: fontSize.md },
    md: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg, fontSize: fontSize.lg },
    lg: { paddingVertical: spacing.lg, paddingHorizontal: spacing.xl, fontSize: fontSize.xl },
  };

  const variantStyles: Record<string, { container: ViewStyle; text: TextStyle }> = {
    primary: {
      container: { backgroundColor: colors.primary },
      text: { color: '#FFFFFF' },
    },
    secondary: {
      container: { backgroundColor: colors.surfaceAlt },
      text: { color: colors.text },
    },
    outline: {
      container: {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: colors.primary,
      },
      text: { color: colors.primary },
    },
    ghost: {
      container: { backgroundColor: 'transparent' },
      text: { color: colors.primary },
    },
    danger: {
      container: { backgroundColor: colors.error },
      text: { color: '#FFFFFF' },
    },
  };

  const isDisabled = disabled || loading;
  const currentVariant = variantStyles[variant];
  const currentSize = sizeStyles[size];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.container,
        currentVariant.container,
        { paddingVertical: currentSize.paddingVertical, paddingHorizontal: currentSize.paddingHorizontal },
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        { borderRadius: borderRadius.md },
      ]}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={currentVariant.text.color} size="small" />
      ) : (
        <>
          {icon && <>{icon}</>}
          <Text style={[styles.text, currentVariant.text, { fontSize: currentSize.fontSize }]}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontWeight: '600',
  },
});
