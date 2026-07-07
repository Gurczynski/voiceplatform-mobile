import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { useThemeContext } from '../../theme/ThemeProvider';

interface ThemedTextProps extends TextProps {
  variant?: 'body' | 'secondary' | 'muted' | 'title' | 'subtitle' | 'caption' | 'label' | 'display';
  weight?: '400' | '500' | '600' | '700';
  align?: 'left' | 'center' | 'right';
}

export function ThemedText({
  variant = 'body',
  weight = '400',
  align = 'left',
  style,
  ...props
}: ThemedTextProps) {
  const { theme } = useThemeContext();
  const { colors, fontSize } = theme;

  const variantStyles = {
    body: { color: colors.text, fontSize: fontSize.lg },
    secondary: { color: colors.textSecondary, fontSize: fontSize.lg },
    muted: { color: colors.textMuted, fontSize: fontSize.md },
    title: { color: colors.text, fontSize: fontSize.xxxl, fontWeight: '700' as const },
    subtitle: { color: colors.text, fontSize: fontSize.xl, fontWeight: '600' as const },
    caption: { color: colors.textMuted, fontSize: fontSize.sm },
    label: { color: colors.textSecondary, fontSize: fontSize.md, fontWeight: '600' as const },
    display: { color: colors.text, fontSize: fontSize.display, fontWeight: '700' as const },
  };

  return (
    <Text
      style={[
        variantStyles[variant],
        { fontWeight: weight, textAlign: align },
        style,
      ]}
      {...props}
    />
  );
}
