// Customer Context Pop-up - Shows full customer history during calls
import { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useThemeContext } from '../../src/theme/ThemeProvider';
import { supabase } from '../../src/lib/supabase';
import { Icon, icons } from '../../src/components/ui';

interface CustomerContextProps {
  contactId?: string;
  phoneNumber?: string;
  organizationId: string;
  onClose?: () => void;
}

interface CustomerData {
  contact: any;
  calls: any[];
  messages: any[];
  voicemails: any[];
  notes: string[];
  tags: string[];
}

export function CustomerContext({ contactId, phoneNumber, organizationId, onClose }: CustomerContextProps) {
  const { theme } = useThemeContext();
  const { colors } = theme;
  const [data, setData] = useState<CustomerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'calls' | 'messages' | 'notes'>('overview');

  useEffect(() => { loadCustomerData(); }, [contactId, phoneNumber]);

  const loadCustomerData = async () => {
    setLoading(true);
    try {
      // Find contact
      let contact = null;
      if (contactId) {
        const { data } = await supabase.from('contacts').select('*').eq('id', contactId).single();
        contact = data;
      } else if (phoneNumber) {
        const { data } = await supabase.from('contacts').select('*').eq('organization_id', organizationId).eq('phone_number', phoneNumber).single();
        contact = data;
      }

      if (!contact) {
        setLoading(false);
        return;
      }

      // Load all related data
      const [callsRes, messagesRes, voicemailsRes] = await Promise.all([
        supabase.from('calls').select('*').eq('contact_id', contact.id).order('started_at', { ascending: false }).limit(20),
        supabase.from('messages').select('*, conversations!inner(phone_number_id)').eq('contact_id', contact.id).order('created_at', { ascending: false }).limit(50),
        supabase.from('voicemail_messages').select('*').eq('contact_id', contact.id).order('created_at', { ascending: false }).limit(10),
      ]);

      setData({
        contact,
        calls: callsRes.data || [],
        messages: messagesRes.data || [],
        voicemails: voicemailsRes.data || [],
        notes: [],
        tags: contact.tags || [],
      });
    } catch (e) {
      console.error('Error loading customer data:', e);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        <View style={styles.loadingState}>
          <Text style={{ color: colors.textMuted }}>Loading customer info...</Text>
        </View>
      </View>
    );
  }

  if (!data?.contact) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        <View style={styles.emptyState}>
          <Icon name={icons.person} size={48} color={colors.textMuted} />
          <Text style={{ color: colors.textMuted }}>Unknown caller</Text>
        </View>
      </View>
    );
  }

  const totalTime = data.calls.reduce((sum, c) => sum + (c.duration_seconds || 0), 0);
  const avgSentiment = data.calls.filter(c => c.ai_sentiment).length > 0
    ? data.calls.filter(c => c.ai_sentiment).reduce((sum, c) => {
        if (c.ai_sentiment === 'positive') return sum + 1;
        if (c.ai_sentiment === 'negative') return sum - 1;
        return sum;
      }, 0) / data.calls.filter(c => c.ai_sentiment).length
    : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {(data.contact.name || '?')[0].toUpperCase()}
            </Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={[styles.name, { color: colors.text }]}>{data.contact.name || 'Unknown'}</Text>
            <Text style={[styles.phone, { color: colors.textMuted }]}>{data.contact.phone_number}</Text>
            {data.contact.company && <Text style={[styles.company, { color: colors.textSecondary }]}>{data.contact.company}</Text>}
          </View>
        </View>
        {onClose && (
          <TouchableOpacity onPress={onClose}>
            <Icon name={icons.close} size={24} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Tags */}
      {data.tags.length > 0 && (
        <View style={styles.tagsRow}>
          {data.tags.map(tag => (
            <View key={tag} style={[styles.tag, { backgroundColor: colors.primary + '15' }]}>
              <Text style={[styles.tagText, { color: colors.primary }]}>{tag}</Text>
            </View>
          ))}
          {data.contact.is_vip && (
            <View style={[styles.tag, { backgroundColor: colors.warning + '15' }]}>
              <Icon name={icons.star} size={12} color={colors.warning} />
              <Text style={[styles.tagText, { color: colors.warning }]}>VIP</Text>
            </View>
          )}
        </View>
      )}

      {/* Quick Stats */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.text }]}>{data.calls.length}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Calls</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.text }]}>{data.messages.length}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Messages</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.text }]}>{Math.floor(totalTime / 60)}m</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Talk Time</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: avgSentiment > 0 ? colors.success : avgSentiment < 0 ? colors.error : colors.textMuted }]}>
            {avgSentiment > 0 ? '😊' : avgSentiment < 0 ? '😞' : '😐'}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Sentiment</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {(['overview', 'calls', 'messages', 'notes'] as const).map(tab => (
          <TouchableOpacity key={tab} style={[styles.tab, activeTab === tab && { borderBottomColor: colors.primary }]} onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabText, { color: activeTab === tab ? colors.primary : colors.textMuted }]}>{tab.charAt(0).toUpperCase() + tab.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <ScrollView style={styles.content}>
        {activeTab === 'overview' && (
          <View style={styles.overviewSection}>
            {data.calls[0]?.ai_summary && (
              <View style={[styles.summaryCard, { backgroundColor: colors.surfaceAlt }]}>
                <Text style={[styles.summaryTitle, { color: colors.text }]}>Last Call Summary</Text>
                <Text style={[styles.summaryText, { color: colors.textSecondary }]}>{data.calls[0].ai_summary}</Text>
              </View>
            )}
            {data.contact.email && (
              <View style={styles.infoRow}>
                <Icon name={icons.mail} size={16} color={colors.textMuted} />
                <Text style={[styles.infoText, { color: colors.text }]}>{data.contact.email}</Text>
              </View>
            )}
            {data.contact.company && (
              <View style={styles.infoRow}>
                <Icon name={icons.people} size={16} color={colors.textMuted} />
                <Text style={[styles.infoText, { color: colors.text }]}>{data.contact.company}</Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'calls' && data.calls.map(call => (
          <View key={call.id} style={[styles.callItem, { backgroundColor: colors.surfaceAlt }]}>
            <View style={styles.callHeader}>
              <Icon name={call.direction === 'inbound' ? icons.call : icons.phoneFilled} size={16} color={call.status === 'completed' ? colors.success : colors.error} />
              <Text style={[styles.callDirection, { color: colors.text }]}>
                {call.direction === 'inbound' ? 'Incoming' : 'Outgoing'}
              </Text>
              <Text style={[styles.callDuration, { color: colors.textMuted }]}>
                {call.duration_seconds ? `${Math.floor(call.duration_seconds / 60)}m ${call.duration_seconds % 60}s` : 'Missed'}
              </Text>
            </View>
            {call.ai_summary && <Text style={[styles.callSummary, { color: colors.textSecondary }]}>{call.ai_summary}</Text>}
            <Text style={[styles.callTime, { color: colors.textMuted }]}>
              {new Date(call.started_at).toLocaleString()}
            </Text>
          </View>
        ))}

        {activeTab === 'messages' && data.messages.map(msg => (
          <View key={msg.id} style={[styles.messageItem, { backgroundColor: colors.surfaceAlt }]}>
            <View style={styles.messageHeader}>
              <Text style={[styles.messageDirection, { color: msg.direction === 'outbound' ? colors.primary : colors.text }]}>
                {msg.direction === 'outbound' ? '→ Sent' : '← Received'}
              </Text>
              <Text style={[styles.messageTime, { color: colors.textMuted }]}>
                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
            <Text style={[styles.messageBody, { color: colors.text }]}>{msg.body}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, borderRadius: 16, overflow: 'hidden' },
  loadingState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 20, fontWeight: '600' },
  headerInfo: { gap: 2 },
  name: { fontSize: 18, fontWeight: '600' },
  phone: { fontSize: 14 },
  company: { fontSize: 13 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, padding: 12, paddingHorizontal: 16 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  tagText: { fontSize: 11, fontWeight: '600' },
  statsRow: { flexDirection: 'row', padding: 16, gap: 12 },
  stat: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 20, fontWeight: '700' },
  statLabel: { fontSize: 11 },
  tabRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontSize: 13, fontWeight: '600' },
  content: { flex: 1, padding: 16 },
  overviewSection: { gap: 12 },
  summaryCard: { padding: 12, borderRadius: 12, gap: 8 },
  summaryTitle: { fontSize: 14, fontWeight: '600' },
  summaryText: { fontSize: 14, lineHeight: 20 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  infoText: { fontSize: 14 },
  callItem: { padding: 12, borderRadius: 10, marginBottom: 8 },
  callHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  callDirection: { fontSize: 14, fontWeight: '500', flex: 1 },
  callDuration: { fontSize: 13 },
  callSummary: { fontSize: 13, marginTop: 4 },
  callTime: { fontSize: 11, marginTop: 4 },
  messageItem: { padding: 10, borderRadius: 10, marginBottom: 6 },
  messageHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  messageDirection: { fontSize: 12, fontWeight: '600' },
  messageTime: { fontSize: 11 },
  messageBody: { fontSize: 14, lineHeight: 20 },
});
