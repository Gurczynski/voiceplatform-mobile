// Ring Groups Management
import { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useThemeContext } from '../../../src/theme/ThemeProvider';
import { useAuthStore } from '../../../src/stores';
import { supabase } from '../../../src/lib/supabase';
import { ThemedView, ThemedText, ThemedHeader, Icon, icons } from '../../../src/components/ui';

export default function RingGroupsScreen() {
  const { theme } = useThemeContext();
  const { colors } = theme;
  const { currentOrganization } = useAuthStore();
  const [groups, setGroups] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [strategy, setStrategy] = useState('simultaneous');

  useEffect(() => { if (currentOrganization?.id) loadGroups(); }, [currentOrganization?.id]);

  const loadGroups = async () => {
    const { data } = await supabase.from('ring_groups').select('*').eq('organization_id', currentOrganization!.id);
    setGroups(data || []);
  };

  const createGroup = async () => {
    if (!name.trim()) return;
    await supabase.from('ring_groups').insert({ organization_id: currentOrganization!.id, name: name.trim(), ring_strategy: strategy, ring_seconds: 20, is_active: true });
    setName(''); setShowCreate(false); loadGroups();
  };

  const deleteGroup = async (id: string) => {
    Alert.alert('Delete', 'Delete this ring group?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await supabase.from('ring_groups').delete().eq('id', id); loadGroups(); } },
    ]);
  };

  return (
    <ThemedView variant="default" style={styles.container}>
      <ThemedHeader title="Ring Groups" showBack rightAction={<TouchableOpacity onPress={() => setShowCreate(!showCreate)}><Icon name={icons.add} size={24} color={colors.primary} /></TouchableOpacity>} />
      <ScrollView contentContainerStyle={styles.content}>
        {showCreate && (
          <View style={[styles.createCard, { backgroundColor: colors.surfaceAlt }]}>
            <TextInput style={[styles.input, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]} placeholder="Group name" placeholderTextColor={colors.textMuted} value={name} onChangeText={setName} />
            <View style={styles.strategyRow}>
              {['simultaneous', 'sequential', 'round_robin'].map(s => (
                <TouchableOpacity key={s} onPress={() => setStrategy(s)} style={[styles.strategyBtn, { backgroundColor: strategy === s ? colors.primary : colors.surface }]}>
                  <Text style={{ color: strategy === s ? '#FFF' : colors.text, fontSize: 12 }}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity onPress={createGroup} style={[styles.createBtn, { backgroundColor: colors.primary }]}><Text style={{ color: '#FFF' }}>Create</Text></TouchableOpacity>
          </View>
        )}
        {groups.length === 0 ? (
          <View style={styles.empty}><Icon name={icons.people} size={48} color={colors.textMuted} /><ThemedText variant="subtitle">No ring groups</ThemedText></View>
        ) : groups.map(g => (
          <View key={g.id} style={[styles.card, { backgroundColor: colors.surfaceAlt }]}>
            <View style={styles.cardInfo}>
              <ThemedText variant="body" weight="600">{g.name}</ThemedText>
              <ThemedText variant="caption">{g.ring_strategy} • {g.ring_seconds}s</ThemedText>
            </View>
            <TouchableOpacity onPress={() => deleteGroup(g.id)}><Icon name={icons.trash} size={20} color={colors.error} /></TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

import { Text } from 'react-native';
const styles = StyleSheet.create({
  container: { flex: 1 }, content: { padding: 16, paddingBottom: 24 },
  createCard: { padding: 16, borderRadius: 12, marginBottom: 16, gap: 12 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  strategyRow: { flexDirection: 'row', gap: 8 },
  strategyBtn: { flex: 1, padding: 10, borderRadius: 8, alignItems: 'center' },
  createBtn: { padding: 12, borderRadius: 8, alignItems: 'center' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  card: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 8 },
  cardInfo: { flex: 1, gap: 2 },
});
