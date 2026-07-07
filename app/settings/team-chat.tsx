// Team Chat - Internal messaging
import { useState, useEffect, useRef } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, TextInput, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { useThemeContext } from '../../src/theme/ThemeProvider';
import { useAuthStore } from '../../src/stores';
import { supabase } from '../../src/lib/supabase';
import { ThemedView, ThemedText, ThemedHeader, Icon, icons } from '../../src/components/ui';

export default function TeamChatScreen() {
  const { theme } = useThemeContext();
  const { colors } = theme;
  const { user, currentOrganization } = useAuthStore();
  const [channels, setChannels] = useState<any[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [channelName, setChannelName] = useState('');
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => { if (currentOrganization?.id) loadChannels(); }, [currentOrganization?.id]);

  useEffect(() => {
    if (!selectedChannel) return;
    loadMessages();
    const channel = supabase.channel(`chat:${selectedChannel.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `channel_id=eq.${selectedChannel.id}` }, (p) => {
        setMessages(prev => [...prev, p.new]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedChannel?.id]);

  const loadChannels = async () => {
    const { data } = await supabase.from('chat_channels').select('*').eq('organization_id', currentOrganization!.id).order('created_at');
    if (data?.length && !selectedChannel) setSelectedChannel(data[0]);
    setChannels(data || []);
  };

  const loadMessages = async () => {
    if (!selectedChannel) return;
    const { data } = await supabase.from('chat_messages').select('*, user_profiles(*)').eq('channel_id', selectedChannel.id).order('created_at').limit(100);
    setMessages(data || []);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChannel || !user) return;
    await supabase.from('chat_messages').insert({ channel_id: selectedChannel.id, user_id: user.id, body: newMessage.trim() });
    setNewMessage('');
  };

  const createChannel = async () => {
    if (!channelName.trim()) return;
    await supabase.from('chat_channels').insert({ organization_id: currentOrganization!.id, name: channelName.trim(), created_by: user?.id });
    setChannelName(''); setShowCreate(false); loadChannels();
  };

  if (!selectedChannel) {
    return (
      <ThemedView variant="default" style={styles.container}>
        <ThemedHeader title="Team Chat" showBack />
        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.createCard, { backgroundColor: colors.surfaceAlt }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Create Channel</Text>
            <TextInput style={[styles.input, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]} placeholder="Channel name" placeholderTextColor={colors.textMuted} value={channelName} onChangeText={setChannelName} />
            <TouchableOpacity onPress={createChannel} style={[styles.saveBtn, { backgroundColor: colors.primary }]}><Text style={{ color: '#FFF', fontWeight: '600' }}>Create</Text></TouchableOpacity>
          </View>
          {channels.map(ch => (
            <TouchableOpacity key={ch.id} style={[styles.channelCard, { backgroundColor: colors.surfaceAlt }]} onPress={() => setSelectedChannel(ch)}>
              <Icon name={icons.chat} size={20} color={colors.primary} />
              <Text style={[styles.channelName, { color: colors.text }]}>{ch.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </ThemedView>
    );
  }

  return (
    <ThemedView variant="default" style={styles.container}>
      <ThemedHeader title={selectedChannel.name} showBack rightAction={
        <TouchableOpacity onPress={() => setSelectedChannel(null)}>
          <Icon name={icons.menu} size={24} color={colors.primary} />
        </TouchableOpacity>
      } />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        {messages.length === 0 ? (
          <View style={styles.emptyChat}>
            <Icon name={icons.chat} size={48} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No messages</Text>
            <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>Start the conversation</Text>
          </View>
        ) : (
          <FlatList ref={flatListRef} data={messages} keyExtractor={i => i.id} contentContainerStyle={styles.msgList}
            renderItem={({ item }) => {
              const isMe = item.user_id === user?.id;
              return (
                <View style={[styles.msgBubble, isMe ? styles.myMsg : styles.theirMsg]}>
                  {!isMe && <Text style={[styles.msgAuthor, { color: colors.primary }]}>{item.user_profiles?.full_name || 'User'}</Text>}
                  <View style={[styles.msgContent, { backgroundColor: isMe ? colors.primary : colors.surfaceAlt }]}>
                    <Text style={{ color: isMe ? '#FFF' : colors.text }}>{item.body}</Text>
                  </View>
                  <Text style={[styles.msgTime, { color: colors.textMuted }]}>{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                </View>
              );
            }}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />
        )}
        <View style={[styles.inputBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <TextInput style={[styles.chatInput, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]} value={newMessage} onChangeText={setNewMessage} placeholder="Type a message..." placeholderTextColor={colors.textMuted} />
          <TouchableOpacity onPress={sendMessage} disabled={!newMessage.trim()} style={[styles.sendBtn, { backgroundColor: newMessage.trim() ? colors.primary : colors.surfaceAlt }]}>
            <Icon name={icons.forward} size={20} color={newMessage.trim() ? '#FFF' : colors.textMuted} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

import { Text } from 'react-native';
const styles = StyleSheet.create({
  container: { flex: 1 }, content: { padding: 16, paddingBottom: 24 },
  createCard: { padding: 16, borderRadius: 16, marginBottom: 16, gap: 12 },
  cardTitle: { fontSize: 18, fontWeight: '700' },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  saveBtn: { padding: 12, borderRadius: 10, alignItems: 'center' },
  channelCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, marginBottom: 8 },
  channelName: { fontSize: 16, fontWeight: '600' },
  emptyChat: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '600' },
  emptyDesc: { fontSize: 14 },
  msgList: { padding: 16, paddingBottom: 8 },
  msgBubble: { marginBottom: 12, maxWidth: '80%' },
  myMsg: { alignSelf: 'flex-end' },
  theirMsg: { alignSelf: 'flex-start' },
  msgAuthor: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  msgContent: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  msgTime: { fontSize: 10, marginTop: 4 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, borderTopWidth: 1, gap: 8 },
  chatInput: { flex: 1, borderWidth: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 16, maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
