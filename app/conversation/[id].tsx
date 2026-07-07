import { useEffect, useState, useCallback, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useThemeContext } from '../../src/theme/ThemeProvider';
import { useAuthStore, useAppStore } from '../../src/stores';
import { supabase } from '../../src/lib/supabase';
import { ThemedView, ThemedText, ThemedHeader, Icon, icons } from '../../src/components/ui';
import type { Message, Conversation } from '../../src/types';

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useThemeContext();
  const { colors, borderRadius } = theme;
  const { user, currentOrganization } = useAuthStore();
  const { sendMessage } = useAppStore();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const { data: conv } = await supabase.from('conversations').select('*, contacts(*), phone_numbers(*)').eq('id', id).single();
      if (conv) setConversation(conv as Conversation);
      const { data: msgs } = await supabase.from('messages').select('*').eq('conversation_id', id).order('created_at', { ascending: true });
      setMessages((msgs || []) as Message[]);
      setLoading(false);
      if (conv?.unread_count > 0) await supabase.from('conversations').update({ unread_count: 0 }).eq('id', id);
    };
    load();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const channel = supabase.channel(`msg:${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${id}` }, (p) => {
        setMessages(prev => [...prev, p.new as Message]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  const handleSend = async () => {
    if (!newMessage.trim() || !conversation || !user || !currentOrganization) return;
    setSending(true);
    const body = newMessage.trim();
    setNewMessage('');
    const { error } = await sendMessage(currentOrganization.id, conversation.phone_number_id, conversation.contacts?.phone_number || '', body);
    if (error) console.error('Send failed:', error);
    setSending(false);
  };

  const formatTime = (d: string) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const formatDate = (d: string) => {
    const date = new Date(d);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isMe = item.direction === 'outbound';
    const showDate = index === 0 || formatDate(item.created_at) !== formatDate(messages[index - 1]?.created_at);

    return (
      <>
        {showDate && (
          <View style={styles.dateSep}>
            <View style={[styles.dateBadge, { backgroundColor: colors.surfaceAlt }]}>
              <ThemedText variant="caption">{formatDate(item.created_at)}</ThemedText>
            </View>
          </View>
        )}
        <View style={[styles.bubble, isMe ? styles.myBubble : styles.theirBubble]}>
          <View style={[styles.bubbleInner, { backgroundColor: isMe ? colors.primary : colors.surfaceAlt, borderRadius: borderRadius.lg }]}>
            <ThemedText variant="body" style={{ color: isMe ? '#FFF' : colors.text }}>{item.body}</ThemedText>
            <View style={styles.msgFooter}>
              <ThemedText variant="caption" style={{ color: isMe ? '#FFF8' : colors.textMuted }}>{formatTime(item.created_at)}</ThemedText>
              {isMe && <Icon name={item.status === 'delivered' ? icons.checkCircle : icons.check} size={12} color={isMe ? '#FFF8' : colors.textMuted} />}
            </View>
          </View>
        </View>
      </>
    );
  };

  if (loading) return <ThemedView variant="default" style={[styles.container, styles.centered]}><ActivityIndicator size="large" color={colors.primary} /></ThemedView>;

  return (
    <ThemedView variant="default" style={styles.container}>
      <ThemedHeader title={conversation?.contacts?.name || conversation?.contacts?.phone_number || 'Conversation'} subtitle={conversation?.contacts?.phone_number} showBack />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        {messages.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name={icons.chat} size={48} color={colors.textMuted} />
            <ThemedText variant="subtitle" align="center">No messages yet</ThemedText>
            <ThemedText variant="muted" align="center">Send a message to start</ThemedText>
          </View>
        ) : (
          <FlatList ref={flatListRef} data={messages} renderItem={renderMessage} keyExtractor={i => i.id} contentContainerStyle={styles.msgList} onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })} />
        )}

        <View style={[styles.inputBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <TouchableOpacity style={styles.attachBtn}>
            <Icon name={icons.add} size={22} color={colors.icon} />
          </TouchableOpacity>
          <TextInput
            style={[styles.input, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
            value={newMessage} onChangeText={setNewMessage}
            placeholder="Type a message..." placeholderTextColor={colors.textMuted}
            multiline maxLength={1600}
          />
          <TouchableOpacity onPress={handleSend} disabled={!newMessage.trim() || sending} style={[styles.sendBtn, { backgroundColor: newMessage.trim() ? colors.primary : colors.surfaceAlt }]}>
            {sending ? <ActivityIndicator color="#FFF" size="small" /> : <Icon name={icons.forward} size={20} color={newMessage.trim() ? '#FFF' : colors.textMuted} />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  msgList: { padding: 16, paddingBottom: 8 },
  dateSep: { alignItems: 'center', marginVertical: 16 },
  dateBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  bubble: { marginBottom: 8, maxWidth: '80%' },
  myBubble: { alignSelf: 'flex-end' },
  theirBubble: { alignSelf: 'flex-start' },
  bubbleInner: { paddingHorizontal: 16, paddingVertical: 10 },
  msgFooter: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, justifyContent: 'flex-end' },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, borderTopWidth: 1, gap: 8 },
  attachBtn: { padding: 4 },
  input: { flex: 1, borderWidth: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 16, maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
});
