// Automations Rules
import { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Switch, Alert } from 'react-native';
import { useThemeContext } from '../../../src/theme/ThemeProvider';
import { useAuthStore } from '../../../src/stores';
import { supabase } from '../../../src/lib/supabase';
import { ThemedView, ThemedText, ThemedHeader, Icon, icons } from '../../../src/components/ui';

const TRIGGERS = [
  { id: 'missed_call', label: 'Missed Call', icon: icons.call },
  { id: 'new_voicemail', label: 'New Voicemail', icon: icons.mic },
  { id: 'new_message', label: 'New Message', icon: icons.chat },
  { id: 'after_hours', label: 'After Hours Call', icon: icons.clock },
  { id: 'vip_caller', label: 'VIP Caller', icon: icons.star },
  { id: 'call_ended', label: 'Call Ended', icon: icons.call },
];

export default function AutomationsScreen() {
  const { theme } = useThemeContext();
  const { colors } = theme;
  const { currentOrganization } = useAuthStore();
  const [automations, setAutomations] = useState<any[]>([]);

  useEffect(() => { if (currentOrganization?.id) loadAutomations(); }, [currentOrganization?.id]);

  const loadAutomations = async () => {
    const { data } = await supabase.from('automations').select('*').eq('organization_id', currentOrganization!.id);
    setAutomations(data || []);
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from('automations').update({ is_active: !active }).eq('id', id);
    loadAutomations();
  };

  const deleteAutomation = async (id: string) => {
    Alert.alert('Delete', 'Delete this automation?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await supabase.from('automations').delete().eq('id', id); loadAutomations(); } },
    ]);
  };

  return (
    <ThemedView variant="default" style={styles.container}>
      <ThemedHeader title="Automations" showBack />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.infoCard, { backgroundColor: colors.surfaceAlt }]}>
          <Icon name={icons.stats} size={20} color={colors.primary} />
          <ThemedText variant="caption" style={{ flex: 1 }}>Automations trigger actions based on events like missed calls, new messages, or after-hours calls.</ThemedText>
        </View>

        {automations.length === 0 ? (
          <View style={styles.empty}>
            <Icon name={icons.stats} size={48} color={colors.textMuted} />
            <ThemedText variant="subtitle">No automations</ThemedText>
            <ThemedText variant="muted">Set up rules to automate your workflow</ThemedText>
          </View>
        ) : automations.map(a => {
          const trigger = TRIGGERS.find(t => t.id === a.trigger);
          return (
            <View key={a.id} style={[styles.card, { backgroundColor: colors.surfaceAlt }]}>
              <View style={styles.cardHeader}>
                <Icon name={trigger?.icon || icons.stats} size={20} color={colors.primary} />
                <View style={styles.cardInfo}>
                  <ThemedText variant="body" weight="600">{a.name}</ThemedText>
                  <ThemedText variant="caption">{trigger?.label || a.trigger}</ThemedText>
                </View>
                <Switch value={a.is_active} onValueChange={() => toggleActive(a.id, a.is_active)} trackColor={{ true: colors.primary }} />
              </View>
              <TouchableOpacity onPress={() => deleteAutomation(a.id)} style={{ alignSelf: 'flex-end' }}>
                <Icon name={icons.trash} size={18} color={colors.error} />
              </TouchableOpacity>
            </View>
          );
        })}

        <ThemedText variant="subtitle" style={{ marginTop: 24, marginBottom: 12 }}>Available Triggers</ThemedText>
        {TRIGGERS.map(t => (
          <View key={t.id} style={[styles.triggerCard, { backgroundColor: colors.surfaceAlt }]}>
            <Icon name={t.icon} size={20} color={colors.primary} />
            <ThemedText variant="body">{t.label}</ThemedText>
          </View>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, content: { padding: 16, paddingBottom: 24 },
  infoCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, marginBottom: 16 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  card: { padding: 14, borderRadius: 12, marginBottom: 8 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardInfo: { flex: 1, gap: 2 },
  triggerCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, marginBottom: 8 },
});
