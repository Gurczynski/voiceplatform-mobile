// Automations - Professional Quality
import { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Switch, Alert, TextInput, Text } from 'react-native';
import { useThemeContext } from '../../../src/theme/ThemeProvider';
import { useAuthStore } from '../../../src/stores';
import { supabase } from '../../../src/lib/supabase';
import { ThemedView, ThemedText, ThemedHeader, Icon, icons } from '../../../src/components/ui';

const TRIGGERS = [
  { id: 'missed_call', label: 'Missed Call', icon: icons.call, color: '#EF4444', desc: 'When a call is missed' },
  { id: 'new_voicemail', label: 'New Voicemail', icon: icons.mic, color: '#8B5CF6', desc: 'When voicemail received' },
  { id: 'new_message', label: 'New Message', icon: icons.chat, color: '#3B82F6', desc: 'When SMS received' },
  { id: 'after_hours', label: 'After Hours', icon: icons.clock, color: '#6366F1', desc: 'Call outside business hours' },
  { id: 'vip_caller', label: 'VIP Caller', icon: icons.star, color: '#F59E0B', desc: 'VIP contact calls' },
  { id: 'call_ended', label: 'Call Ended', icon: icons.call, color: '#10B981', desc: 'After any call ends' },
];

const ACTIONS = [
  { id: 'send_sms', label: 'Send SMS', icon: icons.chat },
  { id: 'send_email', label: 'Send Email', icon: icons.mail },
  { id: 'create_task', label: 'Create Task', icon: icons.check },
  { id: 'notify_team', label: 'Notify Team', icon: icons.people },
  { id: 'assign_agent', label: 'Assign Agent', icon: icons.person },
];

export default function AutomationsScreen() {
  const { theme } = useThemeContext();
  const { colors } = theme;
  const { currentOrganization } = useAuthStore();
  const [automations, setAutomations] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [selectedTrigger, setSelectedTrigger] = useState('');
  const [selectedAction, setSelectedAction] = useState('');

  useEffect(() => { if (currentOrganization?.id) loadAutomations(); }, [currentOrganization?.id]);

  const loadAutomations = async () => {
    const { data } = await supabase.from('automations').select('*').eq('organization_id', currentOrganization!.id);
    setAutomations(data || []);
  };

  const createAutomation = async () => {
    if (!name.trim() || !selectedTrigger || !selectedAction) { Alert.alert('Error', 'Please fill all fields'); return; }
    await supabase.from('automations').insert({ organization_id: currentOrganization!.id, name: name.trim(), trigger: selectedTrigger, actions: [{ type: selectedAction }], conditions: [], is_active: true });
    setName(''); setSelectedTrigger(''); setSelectedAction(''); setShowCreate(false); loadAutomations();
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

  const getTrigger = (id: string) => TRIGGERS.find(t => t.id === id);
  const getAction = (id: string) => ACTIONS.find(a => a.id === id);

  return (
    <ThemedView variant="default" style={styles.container}>
      <ThemedHeader title="Automations" showBack rightAction={
        <TouchableOpacity onPress={() => setShowCreate(!showCreate)} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
          <Icon name={icons.add} size={18} color="#FFF" />
        </TouchableOpacity>
      } />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.infoCard, { backgroundColor: colors.surfaceAlt }]}>
          <Icon name={icons.stats} size={20} color={colors.primary} />
          <ThemedText variant="caption" style={{ flex: 1 }}>Automate repetitive tasks by creating rules that trigger actions when events occur.</ThemedText>
        </View>

        {showCreate && (
          <View style={[styles.createCard, { backgroundColor: colors.surfaceAlt }]}>
            <ThemedText variant="subtitle">New Automation</ThemedText>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Name</Text>
            <TextInput style={[styles.input, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]} placeholder="e.g., Missed Call Follow-up" placeholderTextColor={colors.textMuted} value={name} onChangeText={setName} />

            <Text style={[styles.label, { color: colors.textSecondary }]}>When this happens...</Text>
            <View style={styles.optionGrid}>
              {TRIGGERS.map(t => (
                <TouchableOpacity key={t.id} style={[styles.optionCard, { backgroundColor: selectedTrigger === t.id ? colors.primary + '15' : colors.surface, borderColor: selectedTrigger === t.id ? colors.primary : colors.border }]} onPress={() => setSelectedTrigger(t.id)}>
                  <Icon name={t.icon} size={20} color={selectedTrigger === t.id ? colors.primary : colors.textMuted} />
                  <Text style={{ color: selectedTrigger === t.id ? colors.primary : colors.text, fontSize: 12, fontWeight: '600' }}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { color: colors.textSecondary }]}>Do this...</Text>
            <View style={styles.optionGrid}>
              {ACTIONS.map(a => (
                <TouchableOpacity key={a.id} style={[styles.optionCard, { backgroundColor: selectedAction === a.id ? colors.primary + '15' : colors.surface, borderColor: selectedAction === a.id ? colors.primary : colors.border }]} onPress={() => setSelectedAction(a.id)}>
                  <Icon name={a.icon} size={20} color={selectedAction === a.id ? colors.primary : colors.textMuted} />
                  <Text style={{ color: selectedAction === a.id ? colors.primary : colors.text, fontSize: 12, fontWeight: '600' }}>{a.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.createActions}>
              <TouchableOpacity onPress={() => setShowCreate(false)} style={[styles.cancelBtn, { borderColor: colors.border }]}>
                <Text style={{ color: colors.text }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={createAutomation} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
                <Text style={{ color: '#FFF', fontWeight: '600' }}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {automations.length === 0 && !showCreate ? (
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceAlt }]}>
              <Icon name={icons.stats} size={48} color={colors.textMuted} />
            </View>
            <ThemedText variant="subtitle">No automations</ThemedText>
            <ThemedText variant="muted" align="center">Create rules to automate your workflow</ThemedText>
          </View>
        ) : automations.map(a => {
          const trigger = getTrigger(a.trigger);
          const action = getAction(a.actions?.[0]?.type);
          return (
            <View key={a.id} style={[styles.card, { backgroundColor: colors.surfaceAlt }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.triggerIcon, { backgroundColor: (trigger?.color || colors.primary) + '15' }]}>
                  <Icon name={trigger?.icon || icons.stats} size={20} color={trigger?.color || colors.primary} />
                </View>
                <View style={styles.cardInfo}>
                  <ThemedText variant="body" weight="600">{a.name}</ThemedText>
                  <Text style={{ color: colors.textMuted, fontSize: 12 }}>{trigger?.label} → {action?.label || 'Action'}</Text>
                </View>
                <Switch value={a.is_active} onValueChange={() => toggleActive(a.id, a.is_active)} trackColor={{ true: colors.primary }} />
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity onPress={() => deleteAutomation(a.id)} style={styles.cardAction}>
                  <Icon name={icons.trash} size={16} color={colors.error} />
                  <Text style={{ color: colors.error, fontSize: 13 }}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, content: { padding: 16, paddingBottom: 24 },
  addBtn: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  infoCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, marginBottom: 16 },
  createCard: { padding: 16, borderRadius: 16, marginBottom: 16, gap: 12 },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  optionCard: { width: '48%', flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  createActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1 },
  saveBtn: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyIcon: { width: 80, height: 80, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  card: { padding: 16, borderRadius: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  triggerIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1, gap: 2 },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 },
  cardAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
