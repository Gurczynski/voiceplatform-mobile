// Team Management - Professional Quality
import { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert, Text } from 'react-native';
import { useThemeContext } from '../../src/theme/ThemeProvider';
import { useAuthStore } from '../../src/stores';
import { supabase } from '../../src/lib/supabase';
import { ThemedView, ThemedText, ThemedHeader, Icon, icons } from '../../src/components/ui';

const ROLES = [
  { key: 'owner', label: 'Owner', desc: 'Full access to everything', color: '#EF4444' },
  { key: 'admin', label: 'Admin', desc: 'Manage users, numbers, settings', color: '#F59E0B' },
  { key: 'manager', label: 'Manager', desc: 'View teams and analytics', color: '#3B82F6' },
  { key: 'agent', label: 'Agent', desc: 'Use assigned numbers', color: '#10B981' },
  { key: 'billing_admin', label: 'Billing', desc: 'Manage billing only', color: '#8B5CF6' },
  { key: 'developer', label: 'Developer', desc: 'API and webhooks', color: '#6366F1' },
];

export default function TeamScreen() {
  const { theme } = useThemeContext();
  const { colors } = theme;
  const { currentOrganization, membership } = useAuthStore();
  const [members, setMembers] = useState<any[]>([]);
  const isAdmin = ['owner', 'admin'].includes(membership?.role || '');

  useEffect(() => { if (currentOrganization?.id) loadMembers(); }, [currentOrganization?.id]);

  const loadMembers = async () => {
    const { data } = await supabase.from('organization_members').select('*, user_profiles(*)').eq('organization_id', currentOrganization!.id);
    setMembers(data || []);
  };

  const updateRole = async (id: string, role: string) => {
    if (!isAdmin) return;
    Alert.alert('Change Role', `Change to ${role}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Change', onPress: async () => { await supabase.from('organization_members').update({ role }).eq('id', id); loadMembers(); } },
    ]);
  };

  const removeMember = async (id: string) => {
    if (!isAdmin) return;
    Alert.alert('Remove', 'Remove this team member?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => { await supabase.from('organization_members').update({ is_active: false }).eq('id', id); loadMembers(); } },
    ]);
  };

  const getRoleInfo = (role: string) => ROLES.find(r => r.key === role) || ROLES[3];
  const activeMembers = members.filter(m => m.is_active);

  return (
    <ThemedView variant="default" style={styles.container}>
      <ThemedHeader title="Team" showBack />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.statsRow, { backgroundColor: colors.surfaceAlt }]}>
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: colors.primary }]}>{activeMembers.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Members</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: colors.primary }]}>{activeMembers.filter(m => m.role === 'admin' || m.role === 'owner').length}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Admins</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: colors.primary }]}>{activeMembers.filter(m => m.role === 'agent').length}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Agents</Text>
          </View>
        </View>

        {activeMembers.map(m => {
          const roleInfo = getRoleInfo(m.role);
          return (
            <View key={m.id} style={[styles.card, { backgroundColor: colors.surfaceAlt }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.avatar, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.avatarText, { color: colors.primary }]}>{(m.user_profiles?.full_name || 'U')[0].toUpperCase()}</Text>
                </View>
                <View style={styles.memberInfo}>
                  <ThemedText variant="body" weight="600">{m.user_profiles?.full_name || 'User'}</ThemedText>
                  <ThemedText variant="caption">{m.user_profiles?.email}</ThemedText>
                </View>
                <View style={[styles.roleBadge, { backgroundColor: roleInfo.color + '15' }]}>
                  <Text style={[styles.roleText, { color: roleInfo.color }]}>{roleInfo.label}</Text>
                </View>
              </View>
              {isAdmin && m.role !== 'owner' && (
                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.cardAction} onPress={() => {
                    const options = ROLES.filter(r => r.key !== 'owner').map(r => ({
                      text: r.label, onPress: () => updateRole(m.id, r.key)
                    }));
                    options.push({ text: 'Cancel', onPress: async () => {} });
                    Alert.alert('Change Role', 'Select new role', options);
                  }}>
                    <Icon name={icons.edit} size={16} color={colors.primary} />
                    <Text style={{ color: colors.primary, fontSize: 13 }}>Change Role</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cardAction} onPress={() => removeMember(m.id)}>
                    <Icon name={icons.close} size={16} color={colors.error} />
                    <Text style={{ color: colors.error, fontSize: 13 }}>Remove</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}

        {isAdmin && (
          <TouchableOpacity style={[styles.inviteBtn, { borderColor: colors.primary }]}>
            <Icon name={icons.personAdd} size={20} color={colors.primary} />
            <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 16 }}>Invite Team Member</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, content: { padding: 16, paddingBottom: 24 },
  statsRow: { flexDirection: 'row', padding: 16, borderRadius: 16, marginBottom: 24 },
  stat: { flex: 1, alignItems: 'center', gap: 4 },
  statNum: { fontSize: 24, fontWeight: '700' },
  statLabel: { fontSize: 13 },
  card: { padding: 16, borderRadius: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 20, fontWeight: '600' },
  memberInfo: { flex: 1, gap: 2 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  roleText: { fontSize: 12, fontWeight: '600' },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, marginTop: 12 },
  cardAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  inviteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed' },
});
