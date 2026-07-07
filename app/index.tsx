import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useThemeContext } from '../src/theme/ThemeProvider';
import { ThemedView, ThemedText, ThemedButton, Icon, icons } from '../src/components/ui';

export default function WelcomeScreen() {
  const { theme } = useThemeContext();
  const { colors, spacing, fontSize, borderRadius } = theme;

  return (
    <ThemedView variant="default" style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={[styles.logo, { backgroundColor: colors.primary }]}>
            <Icon name={icons.call} size={40} color="#FFFFFF" />
          </View>
          <ThemedText variant="display" weight="700" align="center">
            VoicePlatform
          </ThemedText>
          <ThemedText variant="subtitle" align="center" style={{ color: colors.textSecondary }}>
            AI-Powered Business Phone
          </ThemedText>
        </View>

        <View style={styles.features}>
          <View style={styles.featureRow}>
            <Icon name={icons.dialpad} size={22} color={colors.primary} />
            <ThemedText variant="body" style={{ flex: 1 }}>Smart call routing & AI receptionist</ThemedText>
          </View>
          <View style={styles.featureRow}>
            <Icon name={icons.chat} size={22} color={colors.primary} />
            <ThemedText variant="body" style={{ flex: 1 }}>Unified messaging & SMS</ThemedText>
          </View>
          <View style={styles.featureRow}>
            <Icon name={icons.stats} size={22} color={colors.primary} />
            <ThemedText variant="body" style={{ flex: 1 }}>Analytics & call insights</ThemedText>
          </View>
        </View>

        <View style={styles.actions}>
          <ThemedButton
            title="Sign In"
            onPress={() => router.push('/auth')}
            variant="primary"
            size="lg"
            icon={<Icon name={icons.logIn} size={20} color="#FFFFFF" />}
          />
          <ThemedButton
            title="Create Account"
            onPress={() => router.push('/auth')}
            variant="outline"
            size="lg"
            icon={<Icon name={icons.personAdd} size={20} color={colors.primary} />}
          />
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', padding: 24, gap: 40 },
  header: { alignItems: 'center', gap: 12 },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  features: { gap: 16, paddingHorizontal: 16 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  actions: { gap: 12 },
});
