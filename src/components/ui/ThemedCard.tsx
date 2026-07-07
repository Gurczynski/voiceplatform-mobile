import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useThemeContext } from '../../theme/ThemeProvider';

interface ThemedCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
}

export function ThemedCard({
  children,
  onPress,
  variant = 'default',
  padding = 'lg',
  style,
}: ThemedCardProps) {
  const { theme } = useThemeContext();
  const { colors, spacing, borderRadius } = theme;

  const paddingMap = { sm: spacing.sm, md: spacing.md, lg: spacing.lg };

  const variantStyles: Record<string, ViewStyle> = {
    default: {
      backgroundColor: colors.card,
      borderRadius: borderRadius.lg,
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
    outlined: {
      backgroundColor: colors.card,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
  };

  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      onPress={onPress}
      style={[variantStyles[variant], { padding: paddingMap[padding] }, style]}
      activeOpacity={onPress ? 0.7 : 1}
    >
      {children}
    </Container>
  );
}

interface StatCardProps {
  value: string | number;
  label: string;
  icon?: string;
  color?: string;
  onPress?: () => void;
}

export function StatCard({ value, label, icon, color, onPress }: StatCardProps) {
  const { theme } = useThemeContext();
  const { colors, spacing, borderRadius, fontSize } = theme;

  return (
    <ThemedCard variant="elevated" padding="md" onPress={onPress} style={styles.statCard}>
      {icon && <Text style={styles.statIcon}>{icon}</Text>}
      <Text style={[styles.statValue, { color: color || colors.primary, fontSize: fontSize.xxxl }]}>
        {value}
      </Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary, fontSize: fontSize.sm }]}>
        {label}
      </Text>
    </ThemedCard>
  );
}

const styles = StyleSheet.create({
  statCard: {
    alignItems: 'center',
    minWidth: '45%',
    flex: 1,
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  statValue: {
    fontWeight: '700',
  },
  statLabel: {
    marginTop: 2,
  },
});
