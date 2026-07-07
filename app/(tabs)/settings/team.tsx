// Team Management
import { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useThemeContext } from '../../../src/theme/ThemeProvider';
import { useAuthStore } from '../../../src/stores';
import { supabase } from '../../../src/lib/supabase';
import { ThemedView, ThemedText, ThemedHeader, Icon, icons } from '../../../src/components/ui';

const ROLES = ['owner', 'admin', 'manager', 'agent', 'billing_admin', 'developer', 'security_admin'];

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
    await supabase.from('organization_members').update({ role }).eq('id', id);
    loadMembers();
  };

  const removeMember = async (id: string) => {
    if (!isAdmin) return;
    Alert.alert('Remove', 'Remove this team member?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => { await supabase.from('organization_members').update({ is_active: false }).eq('id', id); loadMembers(); } },
    ]);
  };

  return (
    <ThemedView variant="default" style={styles.container}>
      <ThemedHeader title="Team" showBack />
      <ScrollView contentContainerStyle={styles.content}>
        {members.filter(m => m.is_active).map(m => (
          <View key={m.id} style={[styles.card, { backgroundColor: colors.surfaceAlt }]}>
            <View style={[styles.avatar, { backgroundColor: colors.surface }]}>
              <Icon name={icons.person} size={24} color={colors.primary} />
            </View>
            <View style={styles.info}>
              <ThemedText variant="body" weight="600">{m.user_profiles?.full_name || 'User'}</ThemedText>
              <ThemedText variant="caption">{m.user_profiles?.email}</ThemedText>
              <View style={[styles.roleBadge, { backgroundColor: colors.primary + '20' }]}>
                <ThemedText variant="caption" style={{ color: colors.primary, textTransform: 'capitalize' }}>{m.role}</ThemedText>
              </View>
            </View>
            {isAdmin && m.role !== 'owner' && (
              <TouchableOpacity onPress={() => removeMember(m.id)}>
                <Icon name={icons.close} size={20} color={colors.error} />
              </TouchableOpacity>
            )}
          </View>
        ))}

        {isAdmin && (
          <TouchableOpacity style={[styles.inviteBtn, { backgroundColor: colors.surfaceAlt }]}>
            <Icon name={icons.personAdd} size={20} color={colors.primary} />
            <ThemedText variant="body" style={{ color: colors.primary }}>Invite Team Member</ThemedText>
          </TouchableOpacity>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, content: { padding: 16, paddingBottom: 24 },
  card: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 8, gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, gap: 2 },
  roleBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginTop: 4 },
  inviteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: '#3B82F6' },
});
