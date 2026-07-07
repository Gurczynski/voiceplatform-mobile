// SMS Campaigns - Bulk SMS with templates and tracking
import { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useThemeContext } from '../../src/theme/ThemeProvider';
import { useAuthStore } from '../../src/stores';
import { supabase } from '../../src/lib/supabase';
import { ThemedView, ThemedText, ThemedHeader, Icon, icons } from '../../src/components/ui';

export default function CampaignsScreen() {
  const { theme } = useThemeContext();
  const { colors } = theme;
  const { currentOrganization } = useAuthStore();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [recipientType, setRecipientType] = useState('all');

  useEffect(() => { if (currentOrganization?.id) loadCampaigns(); }, [currentOrganization?.id]);

  const loadCampaigns = async () => {
    const { data } = await supabase.from('sms_campaigns').select('*').eq('organization_id', currentOrganization!.id).order('created_at', { ascending: false });
    setCampaigns(data || []);
  };

  const createCampaign = async () => {
    if (!name.trim() || !message.trim()) { Alert.alert('Error', 'Name and message required'); return; }
    await supabase.from('sms_campaigns').insert({
      organization_id: currentOrganization!.id, name: name.trim(), message_template: message.trim(),
      recipient_type: recipientType, status: 'draft',
    });
    setName(''); setMessage(''); setShowCreate(false); loadCampaigns();
  };

  const sendCampaign = async (id: string) => {
    Alert.alert('Send Campaign', 'Send this campaign now?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Send', onPress: async () => {
        await supabase.from('sms_campaigns').update({ status: 'running', started_at: new Date().toISOString() }).eq('id', id);
        Alert.alert('Started', 'Campaign is sending...');
        loadCampaigns();
      }},
    ]);
  };

  const getStatusColor = (status: string) => {
    if (status === 'completed') return colors.success;
    if (status === 'running') return colors.primary;
    if (status === 'canceled') return colors.textMuted;
    return colors.warning;
  };

  return (
    <ThemedView variant="default" style={styles.container}>
      <ThemedHeader title="SMS Campaigns" showBack rightAction={
        <TouchableOpacity onPress={() => setShowCreate(!showCreate)} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
          <Icon name={icons.add} size={18} color="#FFF" />
        </TouchableOpacity>
      } />
      <ScrollView contentContainerStyle={styles.content}>
        {showCreate && (
          <View style={[styles.createCard, { backgroundColor: colors.surfaceAlt }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>New Campaign</Text>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Name</Text>
            <TextInput style={[styles.input, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]} placeholder="Campaign name" placeholderTextColor={colors.textMuted} value={name} onChangeText={setName} />
            <Text style={[styles.label, { color: colors.textSecondary }]}>Message</Text>
            <TextInput style={[styles.input, styles.textArea, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]} placeholder="Your message... Use {{name}} for personalization" placeholderTextColor={colors.textMuted} value={message} onChangeText={setMessage} multiline numberOfLines={4} />
            <Text style={[styles.label, { color: colors.textSecondary }]}>Send To</Text>
            <View style={styles.typeRow}>
              {[{ key: 'all', label: 'All Contacts' }, { key: 'tag', label: 'By Tag' }, { key: 'segment', label: 'Segment' }].map(r => (
                <TouchableOpacity key={r.key} style={[styles.typeBtn, { backgroundColor: recipientType === r.key ? colors.primary : colors.surface, borderColor: recipientType === r.key ? colors.primary : colors.border }]} onPress={() => setRecipientType(r.key)}>
                  <Text style={{ color: recipientType === r.key ? '#FFF' : colors.text, fontSize: 12, fontWeight: '600' }}>{r.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.createActions}>
              <TouchableOpacity onPress={() => setShowCreate(false)} style={[styles.cancelBtn, { borderColor: colors.border }]}><Text style={{ color: colors.text }}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={createCampaign} style={[styles.saveBtn, { backgroundColor: colors.primary }]}><Text style={{ color: '#FFF', fontWeight: '600' }}>Create</Text></TouchableOpacity>
            </View>
          </View>
        )}
        {campaigns.length === 0 && !showCreate ? (
          <View style={styles.empty}>
            <Icon name={icons.chat} size={48} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No campaigns</Text>
            <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>Create SMS campaigns to reach your customers</Text>
          </View>
        ) : campaigns.map(c => (
          <View key={c.id} style={[styles.card, { backgroundColor: colors.surfaceAlt }]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardInfo}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>{c.name}</Text>
                <Text style={[styles.cardMeta, { color: colors.textMuted }]}>{c.recipient_type} • {c.status}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: getStatusColor(c.status) + '15' }]}>
                <Text style={[styles.badgeText, { color: getStatusColor(c.status) }]}>{c.status}</Text>
              </View>
            </View>
            <Text style={[styles.msgPreview, { color: colors.textSecondary }]} numberOfLines={2}>{c.message_template}</Text>
            <View style={styles.stats}>
              <Text style={[styles.stat, { color: colors.textMuted }]}>Sent: {c.total_sent}</Text>
              <Text style={[styles.stat, { color: colors.textMuted }]}>Delivered: {c.total_delivered}</Text>
              <Text style={[styles.stat, { color: colors.textMuted }]}>Failed: {c.total_failed}</Text>
            </View>
            {c.status === 'draft' && (
              <TouchableOpacity onPress={() => sendCampaign(c.id)} style={[styles.sendBtn, { backgroundColor: colors.primary }]}>
                <Text style={{ color: '#FFF', fontWeight: '600' }}>Send Now</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

import { Text } from 'react-native';
const styles = StyleSheet.create({
  container: { flex: 1 }, content: { padding: 16, paddingBottom: 24 },
  addBtn: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  createCard: { padding: 16, borderRadius: 16, marginBottom: 16, gap: 12 },
  cardTitle: { fontSize: 18, fontWeight: '700' },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  typeBtn: { flex: 1, padding: 10, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  createActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1 },
  saveBtn: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600' },
  emptyDesc: { fontSize: 14, textAlign: 'center' },
  card: { padding: 16, borderRadius: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardInfo: { flex: 1, gap: 2 },
  cardMeta: { fontSize: 13 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  msgPreview: { fontSize: 14, marginBottom: 8 },
  stats: { flexDirection: 'row', gap: 16, marginBottom: 8 },
  stat: { fontSize: 12 },
  sendBtn: { padding: 10, borderRadius: 8, alignItems: 'center' },
});
