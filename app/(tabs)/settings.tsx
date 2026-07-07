import { View, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeContext } from '../../src/theme/ThemeProvider';
import { useAuthStore } from '../../src/stores';
import { ThemedView, ThemedText, ThemedHeader, ThemedButton, Icon, icons } from '../../src/components/ui';

export default function SettingsScreen() {
  const { theme, themeMode, setThemeMode } = useThemeContext();
  const { colors } = theme;
  const { user, profile, currentOrganization, membership, signOut } = useAuthStore();
  const router = useRouter();
  const isAdmin = ['owner', 'admin'].includes(membership?.role || '');

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => { await signOut(); router.replace('/'); } },
    ]);
  };

  const SettingRow = ({ icon, label, onPress, rightText }: { icon: any; label: string; onPress?: () => void; rightText?: string }) => (
    <TouchableOpacity style={[styles.row, { borderBottomColor: colors.border }]} onPress={onPress} disabled={!onPress}>
      <View style={styles.rowLeft}>
        <Icon name={icon} size={20} color={colors.icon} />
        <ThemedText variant="body">{label}</ThemedText>
      </View>
      {rightText ? (
        <ThemedText variant="caption" style={{ color: colors.textMuted }}>{rightText}</ThemedText>
      ) : (
        <Icon name={icons.forward} size={18} color={colors.textMuted} />
      )}
    </TouchableOpacity>
  );

  return (
    <ThemedView variant="default" style={styles.container}>
      <ThemedHeader title="Settings" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={[styles.profileCard, { backgroundColor: colors.surfaceAlt }]}>
          <View style={[styles.profileAvatar, { backgroundColor: colors.surface }]}>
            <Icon name={icons.person} size={28} color={colors.primary} />
          </View>
          <View style={styles.profileInfo}>
            <ThemedText variant="subtitle">{profile?.full_name || 'User'}</ThemedText>
            <ThemedText variant="muted">{user?.email}</ThemedText>
            {currentOrganization && (
              <ThemedText variant="caption" style={{ color: colors.primary }}>{currentOrganization.name} • {membership?.role}</ThemedText>
            )}
          </View>
          <Icon name={icons.forward} size={18} color={colors.textMuted} />
        </TouchableOpacity>

        <ThemedText variant="label" style={styles.sectionLabel}>Appearance</ThemedText>
        <View style={[styles.card, { backgroundColor: colors.surfaceAlt }]}>
          {(['light', 'dark', 'system'] as const).map(mode => (
            <TouchableOpacity
              key={mode}
              style={[styles.row, { borderBottomColor: colors.border }]}
              onPress={() => setThemeMode(mode)}
            >
              <View style={styles.rowLeft}>
                <Icon name={mode === 'light' ? icons.sun : mode === 'dark' ? icons.moon : icons.phonePortrait} size={20} color={colors.icon} />
                <ThemedText variant="body">{mode.charAt(0).toUpperCase() + mode.slice(1)}</ThemedText>
              </View>
              <View style={[styles.radio, { borderColor: themeMode === mode ? colors.primary : colors.border, backgroundColor: themeMode === mode ? colors.primary : 'transparent' }]}>
                {themeMode === mode && <View style={styles.radioInner} />}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <ThemedText variant="label" style={styles.sectionLabel}>Phone System</ThemedText>
        <View style={[styles.card, { backgroundColor: colors.surfaceAlt }]}>
          <SettingRow icon={icons.phonePortrait} label="Phone Numbers" onPress={() => router.push('/(tabs)/settings/numbers')} />
          <SettingRow icon={icons.dialpad} label="IVR Flows" onPress={() => router.push('/(tabs)/settings/ivr')} />
          <SettingRow icon={icons.call} label="Ring Groups" onPress={() => router.push('/(tabs)/settings/ring-groups')} />
          <SettingRow icon={icons.clock} label="Business Hours" onPress={() => router.push('/(tabs)/settings/business-hours')} />
          <SettingRow icon={icons.forward} label="Forwarding Rules" onPress={() => router.push('/(tabs)/settings/forwarding')} />
        </View>

        <ThemedText variant="label" style={styles.sectionLabel}>AI & Automation</ThemedText>
        <View style={[styles.card, { backgroundColor: colors.surfaceAlt }]}>
          <SettingRow icon={icons.mic} label="AI Receptionist" onPress={() => router.push('/(tabs)/settings/ai-agent')} />
          <SettingRow icon={icons.document} label="Knowledge Base" onPress={() => router.push('/(tabs)/settings/knowledge-base')} />
          <SettingRow icon={icons.stats} label="Automations" onPress={() => router.push('/(tabs)/settings/automations')} />
        </View>

        <ThemedText variant="label" style={styles.sectionLabel}>Billing</ThemedText>
        <View style={[styles.card, { backgroundColor: colors.surfaceAlt }]}>
          <SettingRow icon={icons.star} label="Subscription & Plans" onPress={() => router.push('/(tabs)/settings/billing')} />
          <SettingRow icon={icons.document} label="Invoices" />
        </View>

        {isAdmin && (
          <>
            <ThemedText variant="label" style={styles.sectionLabel}>Team</ThemedText>
            <View style={[styles.card, { backgroundColor: colors.surfaceAlt }]}>
              <SettingRow icon={icons.people} label="Team Members" onPress={() => router.push('/(tabs)/settings/team')} />
              <SettingRow icon={icons.shield} label="Roles & Permissions" />
            </View>
          </>
        )}

        <ThemedText variant="label" style={styles.sectionLabel}>Security</ThemedText>
        <View style={[styles.card, { backgroundColor: colors.surfaceAlt }]}>
          <SettingRow icon={icons.lock} label="Privacy & Security" />
          <SettingRow icon={icons.notifications} label="Notifications" />
          <SettingRow icon={icons.shield} label="A2P Compliance" onPress={() => router.push('/(tabs)/settings/compliance')} />
          <SettingRow icon={icons.time} label="Audit Log" onPress={() => router.push('/(tabs)/settings/audit-log')} />
        </View>

        <ThemedText variant="label" style={styles.sectionLabel}>Support</ThemedText>
        <View style={[styles.card, { backgroundColor: colors.surfaceAlt }]}>
          <SettingRow icon={icons.info} label="Help Center" />
          <SettingRow icon={icons.globe} label="API Documentation" />
        </View>

        <ThemedButton
          title="Sign Out"
          onPress={handleSignOut}
          variant="danger"
          size="md"
          fullWidth
          icon={<Icon name={icons.logOut} size={18} color="#FFFFFF" />}
        />

        <ThemedText variant="caption" align="center" style={styles.version}>VoicePlatform v1.0.0</ThemedText>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 24 },
  profileCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, marginBottom: 24, gap: 14 },
  profileAvatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  profileInfo: { flex: 1, gap: 2 },
  sectionLabel: { marginBottom: 10, marginTop: 8 },
  card: { borderRadius: 12, marginBottom: 16, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFFFFF' },
  version: { marginTop: 24 },
});
