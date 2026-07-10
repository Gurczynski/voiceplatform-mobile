// Webhook Builder - Custom event triggers
import { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Text, TouchableOpacity, TextInput, Switch, Alert } from 'react-native';
import { useThemeContext } from '../../src/theme/ThemeProvider';
import { useAuthStore } from '../../src/stores';
import { supabase } from '../../src/lib/supabase';
import { ThemedView, ThemedText, ThemedHeader, Icon, icons } from '../../src/components/ui';

const EVENTS = [
  { id: 'call.completed', label: 'Call Completed', desc: 'When a call ends' },
  { id: 'call.missed', label: 'Call Missed', desc: 'When a call is missed' },
  { id: 'message.received', label: 'Message Received', desc: 'When SMS/MMS arrives' },
  { id: 'message.sent', label: 'Message Sent', desc: 'When SMS/MMS is sent' },
  { id: 'voicemail.new', label: 'New Voicemail', desc: 'When voicemail is received' },
  { id: 'contact.created', label: 'Contact Created', desc: 'When a new contact is added' },
  { id: 'conversation.opened', label: 'Conversation Opened', desc: 'When a conversation is opened' },
  { id: 'ai.summary', label: 'AI Summary Created', desc: 'When AI generates a call summary' },
];

export default function WebhooksScreen() {
  const { theme } = useThemeContext();
  const { colors } = theme;
  const { currentOrganization } = useAuthStore();
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [url, setUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);

  useEffect(() => { if (currentOrganization?.id) loadWebhooks(); }, [currentOrganization?.id]);

  const loadWebhooks = async () => {
    const { data } = await supabase.from('webhooks').select('*').eq('organization_id', currentOrganization!.id);
    setWebhooks(data || []);
  };

  const createWebhook = async () => {
    if (!url.trim() || selectedEvents.length === 0) {
      Alert.alert('Error', 'URL and at least one event required');
      return;
    }
    await supabase.from('webhooks').insert({
      organization_id: currentOrganization!.id,
      url: url.trim(),
      events: selectedEvents,
      is_active: true,
    });
    setUrl(''); setSelectedEvents([]); setShowCreate(false); loadWebhooks();
  };

  const toggleEvent = (eventId: string) => {
    setSelectedEvents(prev =>
      prev.includes(eventId) ? prev.filter(e => e !== eventId) : [...prev, eventId]
    );
  };

  const toggleWebhook = async (id: string, active: boolean) => {
    await supabase.from('webhooks').update({ is_active: !active }).eq('id', id);
    loadWebhooks();
  };

  const deleteWebhook = async (id: string) => {
    Alert.alert('Delete', 'Delete this webhook?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await supabase.from('webhooks').delete().eq('id', id); loadWebhooks(); } },
    ]);
  };

  return (
    <ThemedView variant="default" style={styles.container}>
      <ThemedHeader title="Webhooks" showBack rightAction={
        <TouchableOpacity onPress={() => setShowCreate(!showCreate)} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
          <Icon name={icons.add} size={18} color="#FFF" />
        </TouchableOpacity>
      } />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.infoCard, { backgroundColor: colors.surfaceAlt }]}>
          <Icon name={icons.globe} size={20} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.textMuted }]}>
            Webhooks send HTTP POST requests to your URL when events occur in your account.
          </Text>
        </View>

        {showCreate && (
          <View style={[styles.createCard, { backgroundColor: colors.surfaceAlt }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>New Webhook</Text>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Endpoint URL</Text>
            <TextInput style={[styles.input, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]} placeholder="https://your-api.com/webhook" placeholderTextColor={colors.textMuted} value={url} onChangeText={setUrl} autoCapitalize="none" />
            <Text style={[styles.label, { color: colors.textSecondary }]}>Events</Text>
            {EVENTS.map(event => (
              <TouchableOpacity key={event.id} style={styles.eventRow} onPress={() => toggleEvent(event.id)}>
                <View style={[styles.checkbox, { borderColor: selectedEvents.includes(event.id) ? colors.primary : colors.border, backgroundColor: selectedEvents.includes(event.id) ? colors.primary : 'transparent' }]}>
                  {selectedEvents.includes(event.id) && <Icon name={icons.check} size={12} color="#FFF" />}
                </View>
                <View style={styles.eventInfo}>
                  <Text style={[styles.eventLabel, { color: colors.text }]}>{event.label}</Text>
                  <Text style={[styles.eventDesc, { color: colors.textMuted }]}>{event.desc}</Text>
                </View>
              </TouchableOpacity>
            ))}
            <View style={styles.actions}>
              <TouchableOpacity onPress={() => setShowCreate(false)} style={[styles.cancelBtn, { borderColor: colors.border }]}><Text style={{ color: colors.text }}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={createWebhook} style={[styles.saveBtn, { backgroundColor: colors.primary }]}><Text style={{ color: '#FFF', fontWeight: '600' }}>Create</Text></TouchableOpacity>
            </View>
          </View>
        )}

        {webhooks.length === 0 && !showCreate ? (
          <View style={styles.empty}>
            <Icon name={icons.globe} size={48} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No webhooks</Text>
            <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>Create webhooks to receive event notifications</Text>
          </View>
        ) : webhooks.map(wh => (
          <View key={wh.id} style={[styles.webhookCard, { backgroundColor: colors.surfaceAlt }]}>
            <View style={styles.webhookHeader}>
              <View style={styles.webhookInfo}>
                <Text style={[styles.webhookUrl, { color: colors.text }]} numberOfLines={1}>{wh.url}</Text>
                <Text style={[styles.webhookEvents, { color: colors.textMuted }]}>{wh.events?.length || 0} events</Text>
              </View>
              <Switch value={wh.is_active} onValueChange={() => toggleWebhook(wh.id, wh.is_active)} trackColor={{ true: colors.primary }} />
            </View>
            <View style={styles.webhookActions}>
              <TouchableOpacity onPress={() => deleteWebhook(wh.id)}>
                <Icon name={icons.trash} size={16} color={colors.error} />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 24 },
  addBtn: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  infoCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, marginBottom: 16 },
  infoText: { flex: 1, fontSize: 14 },
  createCard: { padding: 16, borderRadius: 16, marginBottom: 16, gap: 12 },
  cardTitle: { fontSize: 18, fontWeight: '700' },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  eventInfo: { flex: 1 },
  eventLabel: { fontSize: 14, fontWeight: '500' },
  eventDesc: { fontSize: 12 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1 },
  saveBtn: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600' },
  emptyDesc: { fontSize: 14, textAlign: 'center' },
  webhookCard: { padding: 14, borderRadius: 12, marginBottom: 8 },
  webhookHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  webhookInfo: { flex: 1, marginRight: 12 },
  webhookUrl: { fontSize: 14, fontWeight: '500' },
  webhookEvents: { fontSize: 12, marginTop: 2 },
  webhookActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
});
