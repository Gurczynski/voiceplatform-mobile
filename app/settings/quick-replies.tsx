// Quick Reply Templates - Pre-written SMS responses
import { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useThemeContext } from '../../src/theme/ThemeProvider';
import { useAuthStore } from '../../src/stores';
import { supabase } from '../../src/lib/supabase';
import { ThemedView, ThemedText, ThemedHeader, Icon, icons } from '../../src/components/ui';

interface Template {
  id: string;
  name: string;
  body: string;
  category: string;
  is_active: boolean;
}

const CATEGORIES = ['general', 'greeting', 'follow-up', 'support', 'sales', 'scheduling'];

export default function QuickRepliesScreen() {
  const { theme } = useThemeContext();
  const { colors } = theme;
  const { currentOrganization } = useAuthStore();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('general');

  useEffect(() => { if (currentOrganization?.id) loadTemplates(); }, [currentOrganization?.id]);

  const loadTemplates = async () => {
    // For now, use local storage until we add the table
    const defaultTemplates: Template[] = [
      { id: '1', name: 'Greeting', body: 'Hi! Thanks for reaching out. How can I help you today?', category: 'greeting', is_active: true },
      { id: '2', name: 'Follow Up', body: 'Hi, just following up on our previous conversation. Do you have any questions?', category: 'follow-up', is_active: true },
      { id: '3', name: 'Appointment Confirmed', body: 'Your appointment has been confirmed. We look forward to seeing you!', category: 'scheduling', is_active: true },
      { id: '4', name: 'Out of Office', body: 'Thanks for your message. We\'re currently out of the office and will respond as soon as possible.', category: 'general', is_active: true },
      { id: '5', name: 'Payment Received', body: 'We\'ve received your payment. Thank you for your business!', category: 'sales', is_active: true },
      { id: '6', name: 'Support Ticket', body: 'We\'ve received your support request and will get back to you within 24 hours.', category: 'support', is_active: true },
    ];
    setTemplates(defaultTemplates);
  };

  const addTemplate = () => {
    if (!name.trim() || !body.trim()) {
      Alert.alert('Error', 'Name and message required');
      return;
    }
    const newTemplate: Template = {
      id: Date.now().toString(),
      name: name.trim(),
      body: body.trim(),
      category,
      is_active: true,
    };
    setTemplates(prev => [...prev, newTemplate]);
    setName(''); setBody(''); setShowCreate(false);
  };

  const deleteTemplate = (id: string) => {
    Alert.alert('Delete', 'Delete this template?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => setTemplates(prev => prev.filter(t => t.id !== id)) },
    ]);
  };

  const getCategoryColor = (cat: string) => {
    const colors: Record<string, string> = {
      general: '#3B82F6',
      greeting: '#10B981',
      'follow-up': '#F59E0B',
      support: '#8B5CF6',
      sales: '#EC4899',
      scheduling: '#06B6D4',
    };
    return colors[cat] || '#6B7280';
  };

  return (
    <ThemedView variant="default" style={styles.container}>
      <ThemedHeader title="Quick Replies" showBack rightAction={
        <TouchableOpacity onPress={() => setShowCreate(!showCreate)} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
          <Icon name={icons.add} size={18} color="#FFF" />
        </TouchableOpacity>
      } />

      <ScrollView contentContainerStyle={styles.content}>
        {showCreate && (
          <View style={[styles.createCard, { backgroundColor: colors.surfaceAlt }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>New Template</Text>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Name</Text>
            <TextInput style={[styles.input, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]} placeholder="Template name" placeholderTextColor={colors.textMuted} value={name} onChangeText={setName} />
            <Text style={[styles.label, { color: colors.textSecondary }]}>Category</Text>
            <View style={styles.catRow}>
              {CATEGORIES.map(c => (
                <TouchableOpacity key={c} onPress={() => setCategory(c)} style={[styles.catBtn, { backgroundColor: category === c ? getCategoryColor(c) : colors.surface }]}>
                  <Text style={{ color: category === c ? '#FFF' : colors.text, fontSize: 12 }}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Message</Text>
            <TextInput style={[styles.input, styles.textArea, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]} placeholder="Template message..." placeholderTextColor={colors.textMuted} value={body} onChangeText={setBody} multiline numberOfLines={3} />
            <View style={styles.actions}>
              <TouchableOpacity onPress={() => setShowCreate(false)} style={[styles.cancelBtn, { borderColor: colors.border }]}><Text style={{ color: colors.text }}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={addTemplate} style={[styles.saveBtn, { backgroundColor: colors.primary }]}><Text style={{ color: '#FFF', fontWeight: '600' }}>Save</Text></TouchableOpacity>
            </View>
          </View>
        )}

        {templates.map(template => (
          <TouchableOpacity key={template.id} style={[styles.templateCard, { backgroundColor: colors.surfaceAlt }]}>
            <View style={styles.templateHeader}>
              <View style={[styles.catBadge, { backgroundColor: getCategoryColor(template.category) + '20' }]}>
                <Text style={[styles.catText, { color: getCategoryColor(template.category) }]}>{template.category}</Text>
              </View>
              <TouchableOpacity onPress={() => deleteTemplate(template.id)}>
                <Icon name={icons.close} size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.templateName, { color: colors.text }]}>{template.name}</Text>
            <Text style={[styles.templateBody, { color: colors.textSecondary }]} numberOfLines={2}>{template.body}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

import { Text } from 'react-native';
const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 24 },
  addBtn: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  createCard: { padding: 16, borderRadius: 16, marginBottom: 16, gap: 12 },
  cardTitle: { fontSize: 18, fontWeight: '700' },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  catBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1 },
  saveBtn: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center' },
  templateCard: { padding: 14, borderRadius: 12, marginBottom: 8 },
  templateHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  catBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  catText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  templateName: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  templateBody: { fontSize: 14, lineHeight: 20 },
});
