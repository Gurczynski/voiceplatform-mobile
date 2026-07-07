// More Screen - Hub for all features
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeContext } from '../../src/theme/ThemeProvider';
import { useAuthStore } from '../../src/stores';
import { ThemedView, ThemedText, ThemedHeader, Icon, icons } from '../../src/components/ui';

export default function MoreScreen() {
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

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{title}</Text>
      <View style={[styles.sectionCard, { backgroundColor: colors.surfaceAlt }]}>
        {children}
      </View>
    </View>
  );

  const Row = ({ icon, label, onPress, badge, color }: { icon: any; label: string; onPress?: () => void; badge?: string; color?: string }) => (
    <TouchableOpacity style={[styles.row, { borderBottomColor: colors.border }]} onPress={onPress} disabled={!onPress}>
      <View style={[styles.rowIcon, { backgroundColor: (color || colors.primary) + '15' }]}>
        <Icon name={icon} size={20} color={color || colors.primary} />
      </View>
      <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
      {badge && (
        <View style={[styles.badge, { backgroundColor: colors.error }]}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
      <Icon name={icons.forward} size={18} color={colors.textMuted} />
    </TouchableOpacity>
  );

  return (
    <ThemedView variant="default" style={styles.container}>
      <ThemedHeader title="More" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={[styles.profileCard, { backgroundColor: colors.surfaceAlt }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>{(profile?.full_name || user?.email || 'U')[0].toUpperCase()}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.text }]}>{profile?.full_name || 'User'}</Text>
            <Text style={[styles.profileEmail, { color: colors.textMuted }]}>{user?.email}</Text>
            {currentOrganization && (
              <Text style={[styles.profileOrg, { color: colors.primary }]}>{currentOrganization.name} • {membership?.role}</Text>
            )}
          </View>
          <Icon name={icons.forward} size={18} color={colors.textMuted} />
        </TouchableOpacity>

        <Section title="QUICK ACCESS">
          <Row icon={icons.mic} label="Voicemail" color="#8B5CF6" onPress={() => router.push('/(tabs)/voicemail')} />
          <Row icon={icons.people} label="Contacts" color="#10B981" onPress={() => router.push('/(tabs)/contacts')} />
          <Row icon={icons.recording} label="Recordings" color="#F59E0B" onPress={() => router.push('/(tabs)/recordings')} />
        </Section>

        <Section title="PHONE SYSTEM">
          <Row icon={icons.phonePortrait} label="Phone Numbers" color="#3B82F6" onPress={() => router.push('/settings/numbers')} />
          <Row icon={icons.dialpad} label="IVR Flows" color="#8B5CF6" onPress={() => router.push('/settings/ivr')} />
          <Row icon={icons.call} label="Ring Groups" color="#10B981" onPress={() => router.push('/settings/ring-groups')} />
          <Row icon={icons.clock} label="Business Hours" color="#6366F1" onPress={() => router.push('/settings/business-hours')} />
        </Section>

        <Section title="AI & AUTOMATION">
          <Row icon={icons.mic} label="AI Receptionist" color="#EC4899" onPress={() => router.push('/settings/ai-agent')} />
          <Row icon={icons.document} label="Knowledge Base" color="#8B5CF6" onPress={() => router.push('/settings/knowledge-base')} />
          <Row icon={icons.stats} label="Automations" color="#6366F1" onPress={() => router.push('/settings/automations')} />
          <Row icon={icons.clock} label="Scheduler" color="#F59E0B" onPress={() => router.push('/settings/scheduler')} />
        </Section>

        <Section title="REVENUE">
          <Row icon={icons.chat} label="SMS Campaigns" color="#3B82F6" onPress={() => router.push('/settings/campaigns')} />
          <Row icon={icons.calendar} label="Appointments" color="#10B981" onPress={() => router.push('/settings/appointments')} />
          <Row icon={icons.star} label="Review Requests" color="#F59E0B" onPress={() => router.push('/settings/reviews')} />
          <Row icon={icons.call} label="Payment Collection" color="#EF4444" onPress={() => router.push('/settings/payments')} />
        </Section>

        <Section title="TEAM & TRAINING">
          <Row icon={icons.people} label="Team Members" color="#3B82F6" onPress={() => router.push('/settings/team')} />
          <Row icon={icons.chat} label="Team Chat" color="#10B981" onPress={() => router.push('/settings/team-chat')} />
          <Row icon={icons.document} label="QA Scorecards" color="#8B5CF6" onPress={() => router.push('/settings/qa')} />
          <Row icon={icons.mic} label="Call Simulator" color="#EC4899" onPress={() => router.push('/settings/simulator')} />
        </Section>

        <Section title="BILLING">
          <Row icon={icons.star} label="Subscription & Plans" color="#F59E0B" onPress={() => router.push('/settings/billing')} />
          <Row icon={icons.add} label="Add-ons" color="#3B82F6" onPress={() => router.push('/settings/addons')} />
        </Section>

        <Section title="SECURITY">
          <Row icon={icons.lock} label="Privacy & Security" color="#EF4444" />
          <Row icon={icons.notifications} label="Notifications" color="#F59E0B" />
          <Row icon={icons.shield} label="A2P Compliance" color="#10B981" onPress={() => router.push('/settings/compliance')} />
          <Row icon={icons.time} label="Audit Log" color="#6366F1" onPress={() => router.push('/settings/audit-log')} />
        </Section>

        <Section title="APPEARANCE">
          {(['light', 'dark', 'system'] as const).map(mode => (
            <TouchableOpacity key={mode} style={[styles.row, { borderBottomColor: colors.border }]} onPress={() => setThemeMode(mode)}>
              <View style={[styles.rowIcon, { backgroundColor: mode === 'light' ? '#F59E0B15' : mode === 'dark' ? '#6366F115' : '#3B82F615' }]}>
                <Icon name={mode === 'light' ? icons.sun : mode === 'dark' ? icons.moon : icons.phonePortrait} size={20} color={mode === 'light' ? '#F59E0B' : mode === 'dark' ? '#6366F1' : '#3B82F6'} />
              </View>
              <Text style={[styles.rowLabel, { color: colors.text }]}>{mode.charAt(0).toUpperCase() + mode.slice(1)}</Text>
              {themeMode === mode && <Icon name={icons.check} size={20} color={colors.primary} />}
            </TouchableOpacity>
          ))}
        </Section>

        <TouchableOpacity style={[styles.signOutBtn, { backgroundColor: colors.error + '15' }]} onPress={handleSignOut}>
          <Icon name={icons.logOut} size={20} color={colors.error} />
          <Text style={[styles.signOutText, { color: colors.error }]}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={[styles.version, { color: colors.textMuted }]}>VoicePlatform v1.0.0</Text>
      </ScrollView>
    </ThemedView>
  );
}

import { Text } from 'react-native';
const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 24 },
  profileCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, marginBottom: 24, gap: 14 },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFF', fontSize: 22, fontWeight: '700' },
  profileInfo: { flex: 1, gap: 2 },
  profileName: { fontSize: 18, fontWeight: '600' },
  profileEmail: { fontSize: 14 },
  profileOrg: { fontSize: 13, marginTop: 2 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 8, paddingHorizontal: 4 },
  sectionCard: { borderRadius: 16, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  rowIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { flex: 1, fontSize: 16 },
  badge: { minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  signOutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 12, marginTop: 8 },
  signOutText: { fontSize: 16, fontWeight: '600' },
  version: { textAlign: 'center', marginTop: 20, fontSize: 13 },
});
