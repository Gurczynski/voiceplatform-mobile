import { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeContext } from '../../src/theme/ThemeProvider';
import { useAuthStore } from '../../src/stores';
import { ThemedView, ThemedText, ThemedCard, ThemedHeader, ThemedButton, Icon, icons } from '../../src/components/ui';

export default function SettingsScreen() {
  const { theme, themeMode, setThemeMode, isDark } = useThemeContext();
  const { colors } = theme;
  const { user, profile, currentOrganization, membership, signOut } = useAuthStore();
  const router = useRouter();

  const isAdmin = ['owner', 'admin'].includes(membership?.role || '');

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/');
        },
      },
    ]);
  };

  const themeOptions = [
    { key: 'light', label: 'Light', icon: icons.sun },
    { key: 'dark', label: 'Dark', icon: icons.moon },
    { key: 'system', label: 'System', icon: icons.phonePortrait },
  ] as const;

  return (
    <ThemedView variant="default" style={styles.container}>
      <ThemedHeader title="Settings" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={[styles.profileAvatar, { backgroundColor: colors.surfaceAlt }]}>
            <Icon name={icons.person} size={28} color={colors.primary} />
          </View>
          <View style={styles.profileInfo}>
            <ThemedText variant="subtitle">{profile?.full_name || 'User'}</ThemedText>
            <ThemedText variant="muted">{user?.email}</ThemedText>
            {currentOrganization && (
              <ThemedText variant="caption" style={{ color: colors.primary, marginTop: 4 }}>
                {currentOrganization.name} • {membership?.role}
              </ThemedText>
            )}
          </View>
        </View>

        {/* Appearance */}
        <ThemedText variant="label" style={styles.sectionLabel}>Appearance</ThemedText>
        <ThemedCard variant="outlined" padding="sm">
          {themeOptions.map((option) => (
            <TouchableOpacity
              key={option.key}
              onPress={() => setThemeMode(option.key)}
              style={[styles.settingRow, { borderBottomColor: colors.border }]}
            >
              <View style={styles.settingLeft}>
                <Icon name={option.icon} size={20} color={colors.icon} />
                <ThemedText variant="body">{option.label}</ThemedText>
              </View>
              <View style={[
                styles.radio,
                {
                  borderColor: themeMode === option.key ? colors.primary : colors.border,
                  backgroundColor: themeMode === option.key ? colors.primary : 'transparent',
                },
              ]}>
                {themeMode === option.key && <View style={styles.radioInner} />}
              </View>
            </TouchableOpacity>
          ))}
        </ThemedCard>

        {/* Phone Numbers */}
        <ThemedText variant="label" style={styles.sectionLabel}>Phone System</ThemedText>
        <ThemedCard variant="outlined" padding="sm">
          <TouchableOpacity
            style={[styles.settingRow, { borderBottomColor: colors.border }]}
            onPress={() => router.push('/(tabs)/settings/numbers')}
          >
            <View style={styles.settingLeft}>
              <Icon name={icons.phonePortrait} size={20} color={colors.icon} />
              <ThemedText variant="body">Phone Numbers</ThemedText>
            </View>
            <Icon name={icons.forward} size={18} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.settingRow, { borderBottomColor: colors.border }]}>
            <View style={styles.settingLeft}>
              <Icon name={icons.dialpad} size={20} color={colors.icon} />
              <ThemedText variant="body">IVR Flows</ThemedText>
            </View>
            <Icon name={icons.forward} size={18} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.settingRow, { borderBottomColor: colors.border }]}>
            <View style={styles.settingLeft}>
              <Icon name={icons.call} size={20} color={colors.icon} />
              <ThemedText variant="body">Ring Groups</ThemedText>
            </View>
            <Icon name={icons.forward} size={18} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Icon name={icons.clock} size={20} color={colors.icon} />
              <ThemedText variant="body">Business Hours</ThemedText>
            </View>
            <Icon name={icons.forward} size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </ThemedCard>

        {/* AI & Automation */}
        <ThemedText variant="label" style={styles.sectionLabel}>AI & Automation</ThemedText>
        <ThemedCard variant="outlined" padding="sm">
          <TouchableOpacity style={[styles.settingRow, { borderBottomColor: colors.border }]}>
            <View style={styles.settingLeft}>
              <Icon name={icons.mic} size={20} color={colors.icon} />
              <ThemedText variant="body">AI Receptionist</ThemedText>
            </View>
            <Icon name={icons.forward} size={18} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.settingRow, { borderBottomColor: colors.border }]}>
            <View style={styles.settingLeft}>
              <Icon name={icons.document} size={20} color={colors.icon} />
              <ThemedText variant="body">Knowledge Base</ThemedText>
            </View>
            <Icon name={icons.forward} size={18} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Icon name={icons.stats} size={20} color={colors.icon} />
              <ThemedText variant="body">Automations</ThemedText>
            </View>
            <Icon name={icons.forward} size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </ThemedCard>

        {/* Billing */}
        <ThemedText variant="label" style={styles.sectionLabel}>Billing</ThemedText>
        <ThemedCard variant="outlined" padding="sm">
          <TouchableOpacity
            style={[styles.settingRow, { borderBottomColor: colors.border }]}
            onPress={() => router.push('/(tabs)/settings/billing')}
          >
            <View style={styles.settingLeft}>
              <Icon name={icons.star} size={20} color={colors.icon} />
              <ThemedText variant="body">Subscription & Plans</ThemedText>
            </View>
            <Icon name={icons.forward} size={18} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Icon name={icons.document} size={20} color={colors.icon} />
              <ThemedText variant="body">Invoices</ThemedText>
            </View>
            <Icon name={icons.forward} size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </ThemedCard>

        {/* Team */}
        {isAdmin && (
          <>
            <ThemedText variant="label" style={styles.sectionLabel}>Team</ThemedText>
            <ThemedCard variant="outlined" padding="sm">
              <TouchableOpacity style={[styles.settingRow, { borderBottomColor: colors.border }]}>
                <View style={styles.settingLeft}>
                  <Icon name={icons.people} size={20} color={colors.icon} />
                  <ThemedText variant="body">Team Members</ThemedText>
                </View>
                <Icon name={icons.forward} size={18} color={colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <Icon name={icons.shield} size={20} color={colors.icon} />
                  <ThemedText variant="body">Roles & Permissions</ThemedText>
                </View>
                <Icon name={icons.forward} size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </ThemedCard>
          </>
        )}

        {/* Security */}
        <ThemedText variant="label" style={styles.sectionLabel}>Security</ThemedText>
        <ThemedCard variant="outlined" padding="sm">
          <TouchableOpacity style={[styles.settingRow, { borderBottomColor: colors.border }]}>
            <View style={styles.settingLeft}>
              <Icon name={icons.lock} size={20} color={colors.icon} />
              <ThemedText variant="body">Privacy & Security</ThemedText>
            </View>
            <Icon name={icons.forward} size={18} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.settingRow, { borderBottomColor: colors.border }]}>
            <View style={styles.settingLeft}>
              <Icon name={icons.notifications} size={20} color={colors.icon} />
              <ThemedText variant="body">Notifications</ThemedText>
            </View>
            <Icon name={icons.forward} size={18} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Icon name={icons.time} size={20} color={colors.icon} />
              <ThemedText variant="body">Audit Log</ThemedText>
            </View>
            <Icon name={icons.forward} size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </ThemedCard>

        {/* Support */}
        <ThemedText variant="label" style={styles.sectionLabel}>Support</ThemedText>
        <ThemedCard variant="outlined" padding="sm">
          <TouchableOpacity style={[styles.settingRow, { borderBottomColor: colors.border }]}>
            <View style={styles.settingLeft}>
              <Icon name={icons.info} size={20} color={colors.icon} />
              <ThemedText variant="body">Help Center</ThemedText>
            </View>
            <Icon name={icons.forward} size={18} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Icon name={icons.globe} size={20} color={colors.icon} />
              <ThemedText variant="body">API Documentation</ThemedText>
            </View>
            <Icon name={icons.forward} size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </ThemedCard>

        {/* Sign Out */}
        <ThemedButton
          title="Sign Out"
          onPress={handleSignOut}
          variant="danger"
          size="md"
          fullWidth
          icon={<Icon name={icons.logOut} size={18} color="#FFFFFF" />}
        />

        <ThemedText variant="caption" align="center" style={styles.version}>
          VoicePlatform v1.0.0
        </ThemedText>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
    gap: 16,
  },
  profileAvatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  profileInfo: { flex: 1, gap: 2 },
  sectionLabel: { marginBottom: 12, marginTop: 8 },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFFFFF' },
  version: { marginTop: 24 },
});
