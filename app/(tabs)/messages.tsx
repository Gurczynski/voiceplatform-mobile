// Messages Tab - Real conversations from Supabase
import { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, RefreshControl, StyleSheet, TouchableOpacity, Text, Alert, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeContext } from '../../src/theme/ThemeProvider';
import { useAuthStore, useAppStore } from '../../src/stores';
import { supabase } from '../../src/lib/supabase';
import { ThemedView, ThemedText, ThemedHeader, ThemedInput, Icon, icons } from '../../src/components/ui';

export default function MessagesScreen() {
  const { theme } = useThemeContext();
  const { colors, borderRadius } = theme;
  const { currentOrganization } = useAuthStore();
  const { conversations, loadConversations, isLoadingConversations, subscribeToRealtime, sendMessage } = useAppStore();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [phoneNumbers, setPhoneNumbers] = useState<any[]>([]);
  const [selectedNumber, setSelectedNumber] = useState('');

  useEffect(() => {
    if (currentOrganization?.id) {
      loadConversations(currentOrganization.id);
      loadPhoneNumbers();
      const unsub = subscribeToRealtime(currentOrganization.id);
      return unsub;
    }
  }, [currentOrganization?.id]);

  const loadPhoneNumbers = async () => {
    if (!currentOrganization?.id) return;
    const { data } = await supabase.from('phone_numbers').select('id, phone_number, friendly_name').eq('organization_id', currentOrganization.id).in('status', ['purchased', 'assigned']);
    setPhoneNumbers(data || []);
    if (data?.length) setSelectedNumber(data[0].id);
  };

  const onRefresh = useCallback(async () => {
    if (!currentOrganization?.id) return;
    setRefreshing(true);
    await loadConversations(currentOrganization.id);
    setRefreshing(false);
  }, [currentOrganization?.id]);

  const handleNewMessage = async () => {
    if (!newPhone.trim() || !newMessage.trim() || !selectedNumber || !currentOrganization?.id) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setSending(true);
    const { error } = await sendMessage(currentOrganization.id, selectedNumber, newPhone.trim(), newMessage.trim());
    setSending(false);
    if (error) {
      Alert.alert('Error', error);
    } else {
      setShowNew(false);
      setNewPhone('');
      setNewMessage('');
      loadConversations(currentOrganization.id);
      Alert.alert('Sent', 'Message sent successfully');
    }
  };

  const filteredConversations = conversations.filter(conv => {
    if (!search) return true;
    return (
      conv.contacts?.name?.toLowerCase().includes(search.toLowerCase()) ||
      conv.contacts?.phone_number?.includes(search) ||
      conv.last_message_preview?.toLowerCase().includes(search.toLowerCase())
    );
  });

  const getTimeLabel = (dateStr?: string) => {
    if (!dateStr) return '';
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Now';
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getStatusColor = (status: string) => {
    if (status === 'open') return colors.success;
    if (status === 'pending') return colors.warning;
    return colors.textMuted;
  };

  return (
    <ThemedView variant="default" style={styles.container}>
      <ThemedHeader
        title="Messages"
        subtitle={`${conversations.length} conversations`}
        rightAction={
          <TouchableOpacity onPress={() => setShowNew(!showNew)} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
            <Icon name={icons.add} size={20} color="#FFF" />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {showNew && (
          <View style={[styles.newCard, { backgroundColor: colors.surfaceAlt }]}>
            <Text style={[styles.newTitle, { color: colors.text }]}>New Message</Text>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Send From</Text>
            <View style={styles.numberRow}>
              {phoneNumbers.map(n => (
                <TouchableOpacity key={n.id} style={[styles.numberBtn, { backgroundColor: selectedNumber === n.id ? colors.primary : colors.surface, borderColor: selectedNumber === n.id ? colors.primary : colors.border }]} onPress={() => setSelectedNumber(n.id)}>
                  <Text style={{ color: selectedNumber === n.id ? '#FFF' : colors.text, fontSize: 12 }}>{n.friendly_name || n.phone_number}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.label, { color: colors.textSecondary }]}>To (Phone Number)</Text>
            <TextInput style={[styles.input, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]} placeholder="+1 555 123 4567" placeholderTextColor={colors.textMuted} value={newPhone} onChangeText={setNewPhone} keyboardType="phone-pad" />
            <Text style={[styles.label, { color: colors.textSecondary }]}>Message</Text>
            <TextInput style={[styles.input, styles.textArea, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]} placeholder="Type your message..." placeholderTextColor={colors.textMuted} value={newMessage} onChangeText={setNewMessage} multiline numberOfLines={3} />
            <View style={styles.newActions}>
              <TouchableOpacity onPress={() => setShowNew(false)} style={[styles.cancelBtn, { borderColor: colors.border }]}>
                <Text style={{ color: colors.text }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleNewMessage} disabled={sending} style={[styles.sendBtn, { backgroundColor: colors.primary }]}>
                <Text style={{ color: '#FFF', fontWeight: '600' }}>{sending ? 'Sending...' : 'Send'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <ThemedInput
          placeholder="Search messages..."
          value={search}
          onChangeText={setSearch}
          leftIcon={<Icon name={icons.search} size={18} color={colors.textMuted} />}
        />

        {isLoadingConversations ? (
          <View style={styles.emptyState}>
            <ThemedText variant="muted">Loading conversations...</ThemedText>
          </View>
        ) : filteredConversations.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name={icons.chat} size={48} color={colors.textMuted} />
            <ThemedText variant="subtitle" align="center">No conversations</ThemedText>
            <ThemedText variant="muted" align="center">{search ? 'Try a different search' : 'Tap + to start a new message'}</ThemedText>
          </View>
        ) : (
          filteredConversations.map(conv => (
            <TouchableOpacity
              key={conv.id}
              style={[styles.convItem, { backgroundColor: colors.surfaceAlt }]}
              onPress={() => router.push(`/conversation/${conv.id}`)}
            >
              <View style={[styles.convAvatar, { backgroundColor: colors.surface }]}>
                <Text style={[styles.avatarText, { color: colors.primary }]}>
                  {(conv.contacts?.name || '?')[0].toUpperCase()}
                </Text>
                {conv.unread_count > 0 && (
                  <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.unreadText}>{conv.unread_count}</Text>
                  </View>
                )}
              </View>
              <View style={styles.convInfo}>
                <View style={styles.convHeader}>
                  <ThemedText variant="body" weight="600" style={{ flex: 1 }} numberOfLines={1}>
                    {conv.contacts?.name || conv.contacts?.phone_number || 'Unknown'}
                  </ThemedText>
                  <ThemedText variant="caption">{getTimeLabel(conv.last_message_at)}</ThemedText>
                </View>
                <ThemedText variant="muted" numberOfLines={1}>
                  {conv.last_message_preview || 'No messages yet'}
                </ThemedText>
                <View style={styles.convMeta}>
                  <View style={[styles.statusDot, { backgroundColor: getStatusColor(conv.status) }]} />
                  <ThemedText variant="caption" style={{ textTransform: 'capitalize' }}>{conv.status}</ThemedText>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 24 },
  addBtn: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  newCard: { padding: 16, borderRadius: 16, marginBottom: 16, gap: 12 },
  newTitle: { fontSize: 18, fontWeight: '700' },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 6 },
  numberRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  numberBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  newActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1 },
  sendBtn: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center' },
  convItem: { flexDirection: 'row', padding: 14, borderRadius: 12, marginBottom: 8, gap: 12 },
  convAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 20, fontWeight: '600' },
  unreadBadge: { position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  unreadText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  convInfo: { flex: 1, gap: 4 },
  convHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  convMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 8 },
});
