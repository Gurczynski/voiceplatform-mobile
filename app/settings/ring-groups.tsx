// Ring Groups - Professional Quality
import { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, TextInput, Switch, Alert, Text } from 'react-native';
import { useThemeContext } from '../../src/theme/ThemeProvider';
import { useAuthStore } from '../../src/stores';
import { supabase } from '../../src/lib/supabase';
import { ThemedView, ThemedText, ThemedHeader, Icon, icons } from '../../src/components/ui';

const STRATEGIES = [
  { key: 'simultaneous', label: 'Simultaneous', desc: 'Ring all members at once' },
  { key: 'sequential', label: 'Sequential', desc: 'Ring one by one in order' },
  { key: 'round_robin', label: 'Round Robin', desc: 'Distribute calls evenly' },
];

export default function RingGroupsScreen() {
  const { theme } = useThemeContext();
  const { colors } = theme;
  const { currentOrganization } = useAuthStore();
  const [groups, setGroups] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [strategy, setStrategy] = useState('simultaneous');
  const [ringSeconds, setRingSeconds] = useState('20');

  useEffect(() => { if (currentOrganization?.id) loadGroups(); }, [currentOrganization?.id]);

  const loadGroups = async () => {
    const { data } = await supabase.from('ring_groups').select('*').eq('organization_id', currentOrganization!.id);
    setGroups(data || []);
  };

  const createGroup = async () => {
    if (!name.trim()) return;
    await supabase.from('ring_groups').insert({ organization_id: currentOrganization!.id, name: name.trim(), ring_strategy: strategy, ring_seconds: parseInt(ringSeconds) || 20, is_active: true });
    setName(''); setStrategy('simultaneous'); setRingSeconds('20'); setShowCreate(false); loadGroups();
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from('ring_groups').update({ is_active: !active }).eq('id', id);
    loadGroups();
  };

  const deleteGroup = async (id: string) => {
    Alert.alert('Delete', 'Delete this ring group?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await supabase.from('ring_groups').delete().eq('id', id); loadGroups(); } },
    ]);
  };

  return (
    <ThemedView variant="default" style={styles.container}>
      <ThemedHeader title="Ring Groups" showBack rightAction={
        <TouchableOpacity onPress={() => setShowCreate(!showCreate)} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
          <Icon name={icons.add} size={18} color="#FFF" />
        </TouchableOpacity>
      } />
      <ScrollView contentContainerStyle={styles.content}>
        {showCreate && (
          <View style={[styles.createCard, { backgroundColor: colors.surfaceAlt }]}>
            <ThemedText variant="subtitle">New Ring Group</ThemedText>
            <TextInput style={[styles.input, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]} placeholder="Group name" placeholderTextColor={colors.textMuted} value={name} onChangeText={setName} />
            <ThemedText variant="label" style={{ marginTop: 8 }}>Ring Strategy</ThemedText>
            {STRATEGIES.map(s => (
              <TouchableOpacity key={s.key} style={[styles.strategyCard, { backgroundColor: strategy === s.key ? colors.primary + '15' : colors.surface, borderColor: strategy === s.key ? colors.primary : colors.border }]} onPress={() => setStrategy(s.key)}>
                <View style={[styles.radio, { borderColor: strategy === s.key ? colors.primary : colors.border, backgroundColor: strategy === s.key ? colors.primary : 'transparent' }]}>
                  {strategy === s.key && <View style={styles.radioInner} />}
                </View>
                <View style={styles.strategyInfo}>
                  <ThemedText variant="body" weight="600">{s.label}</ThemedText>
                  <ThemedText variant="caption">{s.desc}</ThemedText>
                </View>
              </TouchableOpacity>
            ))}
            <View style={styles.secondsRow}>
              <ThemedText variant="label">Ring Duration</ThemedText>
              <TextInput style={[styles.secondsInput, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]} value={ringSeconds} onChangeText={setRingSeconds} keyboardType="number-pad" />
              <ThemedText variant="muted">seconds</ThemedText>
            </View>
            <TouchableOpacity onPress={createGroup} style={[styles.createBtn, { backgroundColor: colors.primary }]}>
              <Text style={styles.createBtnText}>Create Ring Group</Text>
            </TouchableOpacity>
          </View>
        )}

        {groups.length === 0 ? (
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceAlt }]}>
              <Icon name={icons.people} size={48} color={colors.textMuted} />
            </View>
            <ThemedText variant="subtitle">No ring groups</ThemedText>
            <ThemedText variant="muted" align="center">Create ring groups to route calls to multiple team members</ThemedText>
          </View>
        ) : groups.map(g => (
          <View key={g.id} style={[styles.card, { backgroundColor: colors.surfaceAlt }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.groupIcon, { backgroundColor: colors.primary + '15' }]}>
                <Icon name={icons.people} size={24} color={colors.primary} />
              </View>
              <View style={styles.groupInfo}>
                <ThemedText variant="body" weight="600">{g.name}</ThemedText>
                <ThemedText variant="caption">{STRATEGIES.find(s => s.key === g.ring_strategy)?.label || g.ring_strategy} • {g.ring_seconds}s ring time</ThemedText>
              </View>
              <Switch value={g.is_active} onValueChange={() => toggleActive(g.id, g.is_active)} trackColor={{ true: colors.primary }} />
            </View>
            <View style={styles.cardActions}>
              <TouchableOpacity style={styles.cardAction}>
                <Icon name={icons.people} size={16} color={colors.primary} />
                <Text style={{ color: colors.primary, fontSize: 13 }}>Manage Members</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => deleteGroup(g.id)} style={styles.cardAction}>
                <Icon name={icons.trash} size={16} color={colors.error} />
                <Text style={{ color: colors.error, fontSize: 13 }}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, content: { padding: 16, paddingBottom: 24 },
  addBtn: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  createCard: { padding: 16, borderRadius: 16, marginBottom: 24, gap: 12 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16 },
  strategyCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, borderWidth: 1, marginTop: 8 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFF' },
  strategyInfo: { flex: 1, gap: 2 },
  secondsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  secondsInput: { width: 60, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 16, textAlign: 'center' },
  createBtn: { padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  createBtnText: { color: '#FFF', fontWeight: '600', fontSize: 16 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyIcon: { width: 80, height: 80, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  card: { padding: 16, borderRadius: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  groupIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  groupInfo: { flex: 1, gap: 2 },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, marginTop: 12 },
  cardAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
