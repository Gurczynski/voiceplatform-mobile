// Trial Banner - Shows when user is on free trial
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeContext } from '../../theme/ThemeProvider';
import { Icon, icons } from './Icon';

interface TrialBannerProps {
  daysLeft: number;
}

export function TrialBanner({ daysLeft }: TrialBannerProps) {
  const { theme } = useThemeContext();
  const { colors } = theme;
  const router = useRouter();

  if (daysLeft <= 0) return null;

  const urgency = daysLeft <= 3 ? 'urgent' : daysLeft <= 7 ? 'warning' : 'normal';
  const bgColor = urgency === 'urgent' ? colors.error + '15' : urgency === 'warning' ? colors.warning + '15' : colors.primary + '15';
  const borderColor = urgency === 'urgent' ? colors.error : urgency === 'warning' ? colors.warning : colors.primary;
  const textColor = urgency === 'urgent' ? colors.error : urgency === 'warning' ? colors.warning : colors.primary;

  return (
    <TouchableOpacity
      style={[styles.banner, { backgroundColor: bgColor, borderColor }]}
      onPress={() => router.push('/settings/billing')}
    >
      <Icon name={icons.clock} size={20} color={textColor} />
      <View style={styles.info}>
        <Text style={[styles.title, { color: textColor }]}>
          {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left in trial
        </Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Upgrade to keep Professional features
        </Text>
      </View>
      <Icon name={icons.forward} size={18} color={textColor} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  info: { flex: 1 },
  title: { fontSize: 14, fontWeight: '600' },
  subtitle: { fontSize: 12 },
});
