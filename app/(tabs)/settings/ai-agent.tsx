// AI Receptionist Configuration
import { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, TextInput, Switch, Alert } from 'react-native';
import { useThemeContext } from '../../../src/theme/ThemeProvider';
import { useAuthStore } from '../../../src/stores';
import { supabase } from '../../../src/lib/supabase';
import { ThemedView, ThemedText, ThemedHeader, Icon, icons } from '../../../src/components/ui';

export default function AiAgentScreen() {
  const { theme } = useThemeContext();
  const { colors } = theme;
  const { currentOrganization } = useAuthStore();
  const [agent, setAgent] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (currentOrganization?.id) loadAgent(); }, [currentOrganization?.id]);

  const loadAgent = async () => {
    const { data } = await supabase.from('ai_agents').select('*').eq('organization_id', currentOrganization!.id).single();
    setAgent(data || { name: 'AI Receptionist', personality: 'professional', tone: 'professional', greeting: 'Hello, how can I help you?', fallback_message: 'Let me transfer you.', is_active: true });
  };

  const save = async () => {
    setSaving(true);
    if (agent.id) {
      await supabase.from('ai_agents').update(agent).eq('id', agent.id);
    } else {
      await supabase.from('ai_agents').insert({ ...agent, organization_id: currentOrganization!.id });
    }
    setSaving(false);
    Alert.alert('Saved', 'AI agent updated');
    loadAgent();
  };

  if (!agent) return <ThemedView variant="default" style={styles.container}><ThemedHeader title="AI Receptionist" showBack /></ThemedView>;

  return (
    <ThemedView variant="default" style={styles.container}>
      <ThemedHeader title="AI Receptionist" showBack />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, { backgroundColor: colors.surfaceAlt }]}>
          <ThemedText variant="label">Agent Name</ThemedText>
          <TextInput style={[styles.input, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]} value={agent.name} onChangeText={(t: string) => setAgent((p: any) => ({ ...p, name: t }))} />

          <ThemedText variant="label">Personality</ThemedText>
          <View style={styles.optionRow}>
            {['professional', 'friendly', 'casual'].map(p => (
              <TouchableOpacity key={p} onPress={() => setAgent((a: any) => ({ ...a, personality: p }))} style={[styles.optionBtn, { backgroundColor: agent.personality === p ? colors.primary : colors.surface }]}>
                <Text style={{ color: agent.personality === p ? '#FFF' : colors.text, textTransform: 'capitalize' }}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <ThemedText variant="label">Greeting</ThemedText>
          <TextInput style={[styles.input, styles.textArea, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]} value={agent.greeting} onChangeText={(t: string) => setAgent((p: any) => ({ ...p, greeting: t }))} multiline numberOfLines={3} />

          <ThemedText variant="label">Fallback Message</ThemedText>
          <TextInput style={[styles.input, styles.textArea, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]} value={agent.fallback_message} onChangeText={(t: string) => setAgent((p: any) => ({ ...p, fallback_message: t }))} multiline numberOfLines={2} />

          <View style={styles.switchRow}>
            <ThemedText variant="body">Active</ThemedText>
            <Switch value={agent.is_active} onValueChange={(v: boolean) => setAgent((p: any) => ({ ...p, is_active: v }))} trackColor={{ true: colors.primary }} />
          </View>
        </View>

        <TouchableOpacity onPress={save} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
          <ThemedText variant="body" style={{ color: '#FFF' }}>{saving ? 'Saving...' : 'Save Changes'}</ThemedText>
        </TouchableOpacity>
      </ScrollView>
    </ThemedView>
  );
}

import { Text } from 'react-native';
const styles = StyleSheet.create({
  container: { flex: 1 }, content: { padding: 16, paddingBottom: 24 },
  card: { padding: 16, borderRadius: 12, gap: 12 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  optionRow: { flexDirection: 'row', gap: 8 },
  optionBtn: { flex: 1, padding: 10, borderRadius: 8, alignItems: 'center' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  saveBtn: { padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 24 },
});
