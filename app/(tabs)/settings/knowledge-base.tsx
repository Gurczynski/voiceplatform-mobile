// Knowledge Base Management
import { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useThemeContext } from '../../../src/theme/ThemeProvider';
import { useAuthStore } from '../../../src/stores';
import { supabase } from '../../../src/lib/supabase';
import { ThemedView, ThemedText, ThemedHeader, Icon, icons } from '../../../src/components/ui';

export default function KnowledgeBaseScreen() {
  const { theme } = useThemeContext();
  const { colors } = theme;
  const { currentOrganization } = useAuthStore();
  const [sources, setSources] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<'faq' | 'text' | 'qa_pair'>('faq');

  useEffect(() => { if (currentOrganization?.id) loadSources(); }, [currentOrganization?.id]);

  const loadSources = async () => {
    const { data } = await supabase.from('ai_knowledge_sources').select('*').eq('organization_id', currentOrganization!.id).order('created_at', { ascending: false });
    setSources(data || []);
  };

  const addSource = async () => {
    if (!title.trim() || !content.trim()) return;
    await supabase.from('ai_knowledge_sources').insert({ organization_id: currentOrganization!.id, type, title: title.trim(), content: content.trim(), is_active: true });
    setTitle(''); setContent(''); setShowAdd(false); loadSources();
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from('ai_knowledge_sources').update({ is_active: !active }).eq('id', id);
    loadSources();
  };

  const deleteSource = async (id: string) => {
    Alert.alert('Delete', 'Delete this knowledge source?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await supabase.from('ai_knowledge_sources').delete().eq('id', id); loadSources(); } },
    ]);
  };

  return (
    <ThemedView variant="default" style={styles.container}>
      <ThemedHeader title="Knowledge Base" showBack rightAction={<TouchableOpacity onPress={() => setShowAdd(!showAdd)}><Icon name={icons.add} size={24} color={colors.primary} /></TouchableOpacity>} />
      <ScrollView contentContainerStyle={styles.content}>
        {showAdd && (
          <View style={[styles.addCard, { backgroundColor: colors.surfaceAlt }]}>
            <ThemedText variant="subtitle">Add Knowledge Source</ThemedText>
            <View style={styles.typeRow}>
              {(['faq', 'text', 'qa_pair'] as const).map(t => (
                <TouchableOpacity key={t} onPress={() => setType(t)} style={[styles.typeBtn, { backgroundColor: type === t ? colors.primary : colors.surface }]}>
                  <Text style={{ color: type === t ? '#FFF' : colors.text, fontSize: 12 }}>{t === 'qa_pair' ? 'Q&A' : t.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={[styles.input, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]} placeholder="Title" placeholderTextColor={colors.textMuted} value={title} onChangeText={setTitle} />
            <TextInput style={[styles.input, styles.textArea, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]} placeholder="Content..." placeholderTextColor={colors.textMuted} value={content} onChangeText={setContent} multiline numberOfLines={4} />
            <TouchableOpacity onPress={addSource} style={[styles.addBtn, { backgroundColor: colors.primary }]}><Text style={{ color: '#FFF' }}>Add Source</Text></TouchableOpacity>
          </View>
        )}

        {sources.length === 0 ? (
          <View style={styles.empty}><Icon name={icons.document} size={48} color={colors.textMuted} /><ThemedText variant="subtitle">No knowledge sources</ThemedText><ThemedText variant="muted">Add FAQs, policies, or Q&A pairs</ThemedText></View>
        ) : sources.map(s => (
          <View key={s.id} style={[styles.card, { backgroundColor: colors.surfaceAlt }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.typeBadge, { backgroundColor: colors.primary + '20' }]}>
                <Text style={{ color: colors.primary, fontSize: 10 }}>{s.type === 'qa_pair' ? 'Q&A' : s.type.toUpperCase()}</Text>
              </View>
              <ThemedText variant="body" weight="600" style={{ flex: 1 }}>{s.title}</ThemedText>
              <TouchableOpacity onPress={() => toggleActive(s.id, s.is_active)}>
                <View style={[styles.dot, { backgroundColor: s.is_active ? colors.success : colors.textMuted }]} />
              </TouchableOpacity>
            </View>
            <ThemedText variant="caption" numberOfLines={2}>{s.content}</ThemedText>
            <TouchableOpacity onPress={() => deleteSource(s.id)} style={{ alignSelf: 'flex-end', marginTop: 8 }}>
              <Icon name={icons.trash} size={18} color={colors.error} />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

import { Text } from 'react-native';
const styles = StyleSheet.create({
  container: { flex: 1 }, content: { padding: 16, paddingBottom: 24 },
  addCard: { padding: 16, borderRadius: 12, marginBottom: 16, gap: 12 },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeBtn: { flex: 1, padding: 8, borderRadius: 8, alignItems: 'center' },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  addBtn: { padding: 12, borderRadius: 8, alignItems: 'center' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  card: { padding: 14, borderRadius: 12, marginBottom: 8 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
