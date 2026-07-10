// Unified Inbox - All messages in one place
import { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Text, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeContext } from '../../src/theme/ThemeProvider';
import { useAuthStore } from '../../src/stores';
import { supabase } from '../../src/lib/supabase';
import { ThemedView, ThemedText, ThemedHeader, Icon, icons } from '../../src/components/ui';

interface InboxItem {
  id: string;
  type: 'sms' | 'voicemail' | 'email' | 'note';
  title: string;
  preview: string;
  timestamp: string;
  unread: boolean;
  contact?: string;
}

export default function UnifiedInboxScreen() {
  const { theme } = useThemeContext();
  const { colors } = theme;
  const { currentOrganization } = useAuthStore();
  const router = useRouter();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'sms' | 'voicemail' | 'email'>('all');

  useEffect(() => { if (currentOrganization?.id) loadInbox(); }, [currentOrganization?.id]);

  const loadInbox = async () => {
    if (!currentOrganization?.id) return;

    // Load conversations (SMS)
    const { data: conversations } = await supabase
      .from('conversations')
      .select('*, contacts(*)')
      .eq('organization_id', currentOrganization.id)
      .order('last_message_at', { ascending: false })
      .limit(50);

    // Load voicemails
    const { data: voicemails } = await supabase
      .from('voicemail_messages')
      .select('*, contacts(*)')
      .eq('organization_id', currentOrganization.id)
      .order('created_at', { ascending: false })
      .limit(20);

    const inboxItems: InboxItem[] = [
      ...(conversations || []).map(c => ({
        id: c.id,
        type: 'sms' as const,
        title: c.contacts?.name || c.contacts?.phone_number || 'Unknown',
        preview: c.last_message_preview || 'No messages',
        timestamp: c.last_message_at || c.created_at,
        unread: c.unread_count > 0,
        contact: c.contacts?.name,
      })),
      ...(voicemails || []).map(v => ({
        id: v.id,
        type: 'voicemail' as const,
        title: v.contacts?.name || v.from_number,
        preview: v.ai_summary || v.transcription || 'Voicemail',
        timestamp: v.created_at,
        unread: v.status === 'new',
        contact: v.contacts?.name,
      })),
    ];

    // Sort by timestamp
    inboxItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setItems(inboxItems);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadInbox();
    setRefreshing(false);
  }, [currentOrganization?.id]);

  const filteredItems = items.filter(item => {
    if (filter === 'all') return true;
    return item.type === filter;
  });

  const getTimeLabel = (dateStr: string) => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Now';
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'sms': return icons.chat;
      case 'voicemail': return icons.mic;
      case 'email': return icons.mail;
      default: return icons.chat;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'sms': return '#3B82F6';
      case 'voicemail': return '#8B5CF6';
      case 'email': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const handleItemPress = (item: InboxItem) => {
    if (item.type === 'sms') {
      router.push(`/conversation/${item.id}`);
    } else if (item.type === 'voicemail') {
      router.push('/(tabs)/voicemail');
    }
  };

  const totalUnread = items.filter(i => i.unread).length;

  return (
    <ThemedView variant="default" style={styles.container}>
      <ThemedHeader
        title="Inbox"
        subtitle={totalUnread > 0 ? `${totalUnread} unread` : 'All caught up'}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
          {(['all', 'sms', 'voicemail', 'email'] as const).map(f => (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
              style={[styles.filterChip, { backgroundColor: filter === f ? colors.primary : colors.surfaceAlt, borderRadius: borderRadius.full }]}
            >
              <Text style={[styles.filterText, { color: filter === f ? '#FFF' : colors.textSecondary }]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {filteredItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name={icons.chat} size={48} color={colors.textMuted} />
            <ThemedText variant="subtitle" align="center">Inbox empty</ThemedText>
          </View>
        ) : (
          filteredItems.map(item => (
            <TouchableOpacity
              key={`${item.type}-${item.id}`}
              style={[styles.inboxItem, { backgroundColor: item.unread ? colors.primary + '08' : colors.surfaceAlt }]}
              onPress={() => handleItemPress(item)}
            >
              <View style={[styles.typeIcon, { backgroundColor: getTypeColor(item.type) + '15' }]}>
                <Icon name={getTypeIcon(item.type)} size={20} color={getTypeColor(item.type)} />
              </View>
              <View style={styles.itemContent}>
                <View style={styles.itemHeader}>
                  <Text style={[styles.itemTitle, { color: colors.text, fontWeight: item.unread ? '700' : '500' }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={[styles.itemTime, { color: colors.textMuted }]}>
                    {getTimeLabel(item.timestamp)}
                  </Text>
                </View>
                <Text style={[styles.itemPreview, { color: item.unread ? colors.text : colors.textMuted }]} numberOfLines={1}>
                  {item.preview}
                </Text>
              </View>
              {item.unread && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </ThemedView>
  );
}

const borderRadius = { full: 999 };

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 24 },
  filterRow: { marginBottom: 16 },
  filterContent: { gap: 8 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8 },
  filterText: { fontSize: 14, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  inboxItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, marginBottom: 8, gap: 12 },
  typeIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  itemContent: { flex: 1 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemTitle: { fontSize: 15, flex: 1 },
  itemTime: { fontSize: 12 },
  itemPreview: { fontSize: 13, marginTop: 2 },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
});
