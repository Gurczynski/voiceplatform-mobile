// Knowledge Base - Professional Quality
import { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, TextInput, Switch, Alert, Text } from 'react-native';
import { useThemeContext } from '../../src/theme/ThemeProvider';
import { useAuthStore } from '../../src/stores';
import { supabase } from '../../src/lib/supabase';
import { ThemedView, ThemedText, ThemedHeader, Icon, icons } from '../../src/components/ui';

const TYPES = [
  { key: 'faq', label: 'FAQ', icon: icons.info, desc: 'Frequently asked questions' },
  { key: 'text', label: 'Text', icon: icons.document, desc: 'Business information' },
  { key: 'qa_pair', label: 'Q&A', icon: icons.chat, desc: 'Question and answer pairs' },
];

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
    if (!title.trim() || !content.trim()) { Alert.alert('Error', 'Title and content required'); return; }
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

  const getTypeInfo = (t: string) => TYPES.find(x => x.key === t) || TYPES[0];

  return (
    <ThemedView variant="default" style={styles.container}>
      <ThemedHeader title="Knowledge Base" showBack rightAction={
        <TouchableOpacity onPress={() => setShowAdd(!showAdd)} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
          <Icon name={icons.add} size={18} color="#FFF" />
        </TouchableOpacity>
      } />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.infoCard, { backgroundColor: colors.surfaceAlt }]}>
          <Icon name={icons.document} size={20} color={colors.primary} />
          <ThemedText variant="caption" style={{ flex: 1 }}>Add FAQs, policies, and information your AI receptionist can use to answer caller questions.</ThemedText>
        </View>

        {showAdd && (
          <View style={[styles.addCard, { backgroundColor: colors.surfaceAlt }]}>
            <ThemedText variant="subtitle">Add Knowledge Source</ThemedText>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Type</Text>
            <View style={styles.typeRow}>
              {TYPES.map(t => (
                <TouchableOpacity key={t.key} style={[styles.typeBtn, { backgroundColor: type === t.key ? colors.primary : colors.surface, borderColor: type === t.key ? colors.primary : colors.border }]} onPress={() => setType(t.key as any)}>
                  <Icon name={t.icon} size={16} color={type === t.key ? '#FFF' : colors.textMuted} />
                  <Text style={{ color: type === t.key ? '#FFF' : colors.text, fontSize: 12, fontWeight: '600' }}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Title</Text>
            <TextInput style={[styles.input, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]} placeholder="e.g., Business Hours, Return Policy" placeholderTextColor={colors.textMuted} value={title} onChangeText={setTitle} />
            <Text style={[styles.label, { color: colors.textSecondary }]}>Content</Text>
            <TextInput style={[styles.input, styles.textArea, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]} placeholder="Enter the information..." placeholderTextColor={colors.textMuted} value={content} onChangeText={setContent} multiline numberOfLines={4} />
            <View style={styles.addActions}>
              <TouchableOpacity onPress={() => setShowAdd(false)} style={[styles.cancelBtn, { borderColor: colors.border }]}>
                <Text style={{ color: colors.text }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={addSource} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
                <Text style={{ color: '#FFF', fontWeight: '600' }}>Add Source</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {sources.length === 0 && !showAdd ? (
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceAlt }]}>
              <Icon name={icons.document} size={48} color={colors.textMuted} />
            </View>
            <ThemedText variant="subtitle">No knowledge sources</ThemedText>
            <ThemedText variant="muted" align="center">Add FAQs, policies, or Q&A pairs for your AI</ThemedText>
          </View>
        ) : sources.map(s => {
          const typeInfo = getTypeInfo(s.type);
          return (
            <View key={s.id} style={[styles.card, { backgroundColor: colors.surfaceAlt }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.typeIcon, { backgroundColor: colors.primary + '15' }]}>
                  <Icon name={typeInfo.icon} size={20} color={colors.primary} />
                </View>
                <View style={styles.cardInfo}>
                  <ThemedText variant="body" weight="600">{s.title}</ThemedText>
                  <ThemedText variant="caption">{typeInfo.label}</ThemedText>
                </View>
                <Switch value={s.is_active} onValueChange={() => toggleActive(s.id, s.is_active)} trackColor={{ true: colors.primary }} />
              </View>
              <Text style={[styles.contentPreview, { color: colors.textSecondary }]} numberOfLines={3}>{s.content}</Text>
              <View style={styles.cardActions}>
                <TouchableOpacity onPress={() => deleteSource(s.id)} style={styles.cardAction}>
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
  addCard: { padding: 16, borderRadius: 16, marginBottom: 16, gap: 12 },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 4 },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 10, borderRadius: 10, borderWidth: 1 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  addActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1 },
  saveBtn: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyIcon: { width: 80, height: 80, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  card: { padding: 16, borderRadius: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  typeIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1, gap: 2 },
  contentPreview: { fontSize: 14, lineHeight: 20, marginBottom: 12 },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end' },
  cardAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
