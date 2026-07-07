// AI Receptionist - Professional Quality
import { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, TextInput, Switch, Alert, Text } from 'react-native';
import { useThemeContext } from '../../../src/theme/ThemeProvider';
import { useAuthStore } from '../../../src/stores';
import { supabase } from '../../../src/lib/supabase';
import { ThemedView, ThemedText, ThemedHeader, Icon, icons } from '../../../src/components/ui';

const TONES = [
  { key: 'professional', label: 'Professional', desc: 'Formal and business-like' },
  { key: 'friendly', label: 'Friendly', desc: 'Warm and approachable' },
  { key: 'casual', label: 'Casual', desc: 'Relaxed and conversational' },
];

const VOICES = [
  { id: 'Polly.Joanna', label: 'Joanna (Female)' },
  { id: 'Polly.Matthew', label: 'Matthew (Male)' },
  { id: 'Polly.Salli', label: 'Salli (Female)' },
  { id: 'Polly.Brian', label: 'Brian (Male)' },
];

export default function AiAgentScreen() {
  const { theme } = useThemeContext();
  const { colors } = theme;
  const { currentOrganization } = useAuthStore();
  const [agent, setAgent] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (currentOrganization?.id) loadAgent(); }, [currentOrganization?.id]);

  const loadAgent = async () => {
    const { data } = await supabase.from('ai_agents').select('*').eq('organization_id', currentOrganization!.id).single();
    setAgent(data || { name: 'AI Receptionist', personality: 'professional', tone: 'professional', greeting: 'Thank you for calling! I\'m your AI assistant. How can I help you today?', fallback_message: 'I\'m sorry, I couldn\'t understand. Let me transfer you to a human.', business_name: '', is_active: true, voice_id: 'Polly.Joanna' });
  };

  const save = async () => {
    setSaving(true);
    if (agent.id) await supabase.from('ai_agents').update(agent).eq('id', agent.id);
    else await supabase.from('ai_agents').insert({ ...agent, organization_id: currentOrganization!.id });
    setSaving(false);
    Alert.alert('Saved', 'AI receptionist updated');
    loadAgent();
  };

  if (!agent) return <ThemedView variant="default" style={styles.container}><ThemedHeader title="AI Receptionist" showBack /></ThemedView>;

  return (
    <ThemedView variant="default" style={styles.container}>
      <ThemedHeader title="AI Receptionist" showBack />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.previewCard, { backgroundColor: colors.primary + '10' }]}>
          <View style={[styles.previewIcon, { backgroundColor: colors.primary }]}>
            <Icon name={icons.mic} size={32} color="#FFF" />
          </View>
          <ThemedText variant="subtitle">{agent.name}</ThemedText>
          <ThemedText variant="muted">{agent.is_active ? 'Active - Answering calls' : 'Inactive'}</ThemedText>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Configuration</Text>
        <View style={[styles.card, { backgroundColor: colors.surfaceAlt }]}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Agent Name</Text>
          <TextInput style={[styles.input, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]} value={agent.name} onChangeText={(t: string) => setAgent((p: any) => ({ ...p, name: t }))} />

          <Text style={[styles.label, { color: colors.textSecondary }]}>Business Name</Text>
          <TextInput style={[styles.input, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]} value={agent.business_name} onChangeText={(t: string) => setAgent((p: any) => ({ ...p, business_name: t }))} placeholder="Your Business Name" placeholderTextColor={colors.textMuted} />

          <Text style={[styles.label, { color: colors.textSecondary }]}>Voice</Text>
          <View style={styles.voiceRow}>
            {VOICES.map(v => (
              <TouchableOpacity key={v.id} style={[styles.voiceBtn, { backgroundColor: agent.voice_id === v.id ? colors.primary : colors.surface, borderColor: agent.voice_id === v.id ? colors.primary : colors.border }]} onPress={() => setAgent((p: any) => ({ ...p, voice_id: v.id }))}>
                <Text style={{ color: agent.voice_id === v.id ? '#FFF' : colors.text, fontSize: 12 }}>{v.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.label, { color: colors.textSecondary }]}>Tone</Text>
          <View style={styles.toneRow}>
            {TONES.map(t => (
              <TouchableOpacity key={t.key} style={[styles.toneBtn, { backgroundColor: agent.tone === t.key ? colors.primary : colors.surface, borderColor: agent.tone === t.key ? colors.primary : colors.border }]} onPress={() => setAgent((p: any) => ({ ...p, tone: t.key }))}>
                <Text style={{ color: agent.tone === t.key ? '#FFF' : colors.text, fontWeight: '600' }}>{t.label}</Text>
                <Text style={{ color: agent.tone === t.key ? '#FFF8' : colors.textMuted, fontSize: 11 }}>{t.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Messages</Text>
        <View style={[styles.card, { backgroundColor: colors.surfaceAlt }]}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Greeting Message</Text>
          <TextInput style={[styles.input, styles.textArea, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]} value={agent.greeting} onChangeText={(t: string) => setAgent((p: any) => ({ ...p, greeting: t }))} multiline numberOfLines={3} />

          <Text style={[styles.label, { color: colors.textSecondary }]}>Fallback Message</Text>
          <TextInput style={[styles.input, styles.textArea, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]} value={agent.fallback_message} onChangeText={(t: string) => setAgent((p: any) => ({ ...p, fallback_message: t }))} multiline numberOfLines={2} />
        </View>

        <View style={[styles.card, { backgroundColor: colors.surfaceAlt }]}>
          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Text style={{ color: colors.text, fontWeight: '600' }}>Active</Text>
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>Enable AI receptionist for incoming calls</Text>
            </View>
            <Switch value={agent.is_active} onValueChange={(v: boolean) => setAgent((p: any) => ({ ...p, is_active: v }))} trackColor={{ true: colors.primary }} />
          </View>
        </View>

        <TouchableOpacity onPress={save} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
          <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, content: { padding: 16, paddingBottom: 24 },
  previewCard: { alignItems: 'center', padding: 24, borderRadius: 16, marginBottom: 24, gap: 8 },
  previewIcon: { width: 64, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  card: { padding: 16, borderRadius: 12, marginBottom: 16, gap: 12 },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  voiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  voiceBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  toneRow: { gap: 8 },
  toneBtn: { padding: 12, borderRadius: 10, borderWidth: 1, gap: 2 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  switchInfo: { flex: 1, gap: 2 },
  saveBtn: { padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#FFF', fontWeight: '600', fontSize: 16 },
});
