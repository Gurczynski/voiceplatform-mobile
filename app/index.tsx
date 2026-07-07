import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeContext } from '../src/theme/ThemeProvider';
import { ThemedView, ThemedText, ThemedButton, Icon, icons } from '../src/components/ui';

export default function WelcomeScreen() {
  const { theme } = useThemeContext();
  const { colors } = theme;
  const insets = useSafeAreaInsets();

  return (
    <ThemedView variant="default" style={styles.container}>
      <View style={[styles.content, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}>
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
            <View style={[styles.featureIcon, { backgroundColor: colors.surfaceAlt }]}>
              <Icon name={icons.dialpad} size={20} color={colors.primary} />
            </View>
            <View style={styles.featureText}>
              <ThemedText variant="body" weight="600">Smart Call Routing</ThemedText>
              <ThemedText variant="caption">AI receptionist & IVR flows</ThemedText>
            </View>
          </View>
          <View style={styles.featureRow}>
            <View style={[styles.featureIcon, { backgroundColor: colors.surfaceAlt }]}>
              <Icon name={icons.chat} size={20} color={colors.primary} />
            </View>
            <View style={styles.featureText}>
              <ThemedText variant="body" weight="600">Unified Messaging</ThemedText>
              <ThemedText variant="caption">SMS, MMS & team inbox</ThemedText>
            </View>
          </View>
          <View style={styles.featureRow}>
            <View style={[styles.featureIcon, { backgroundColor: colors.surfaceAlt }]}>
              <Icon name={icons.stats} size={20} color={colors.primary} />
            </View>
            <View style={styles.featureText}>
              <ThemedText variant="body" weight="600">Analytics & Insights</ThemedText>
              <ThemedText variant="caption">Call summaries & reporting</ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          <ThemedButton
            title="Sign In"
            onPress={() => router.push('/auth')}
            variant="primary"
            size="lg"
          />
          <ThemedButton
            title="Create Account"
            onPress={() => router.push('/auth?mode=signup')}
            variant="outline"
            size="lg"
          />
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 24 },
  header: { alignItems: 'center', gap: 16 },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  features: { gap: 20 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  featureIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  featureText: { flex: 1, gap: 2 },
  actions: { gap: 12 },
});
