import { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeContext } from '../src/theme/ThemeProvider';
import { useAuthStore } from '../src/stores';
import { supabase, callEdgeFunction } from '../src/lib/supabase';
import { ThemedView, ThemedText, Icon, icons } from '../src/components/ui';

interface Msg { id: string; role: 'user' | 'assistant'; content: string; time: Date; }

export default function AIVoiceScreen() {
  const { theme } = useThemeContext();
  const { colors, borderRadius } = theme;
  const { currentOrganization } = useAuthStore();
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [agentName, setAgentName] = useState('AI Assistant');
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!currentOrganization?.id) return;
    supabase.from('ai_agents').select('name, greeting').eq('organization_id', currentOrganization.id).eq('is_active', true).single()
      .then(({ data }) => {
        if (data) {
          setAgentName(data.name);
          if (data.greeting) setMessages([{ id: '1', role: 'assistant', content: data.greeting, time: new Date() }]);
        }
      });
  }, []);

  const send = async () => {
    if (!input.trim() || !currentOrganization?.id) return;
    const text = input.trim();
    setInput('');
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: text, time: new Date() }]);
    setLoading(true);

    const { data, error } = await callEdgeFunction('ai-chat', {
      organizationId: currentOrganization.id,
      message: text,
      history: messages.map(m => ({ role: m.role, content: m.content })),
    });

    setLoading(false);
    const response = error ? 'Sorry, I encountered an error.' : data?.response || 'How can I help you?';
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: response, time: new Date() }]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  return (
    <ThemedView variant="default" style={styles.container}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border, paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Icon name={icons.back} size={24} color={colors.icon} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <ThemedText variant="subtitle">{agentName}</ThemedText>
          <ThemedText variant="caption" style={{ color: colors.success }}>AI Assistant</ThemedText>
        </View>
        <View style={[styles.badge, { backgroundColor: colors.primary }]}>
          <ThemedText variant="caption" style={{ color: '#FFF' }}>AI</ThemedText>
        </View>
      </View>

      <ScrollView ref={scrollRef} style={styles.msgs} contentContainerStyle={styles.msgContent} onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
        {messages.map(msg => (
          <View key={msg.id} style={[styles.bubble, msg.role === 'user' ? styles.userBubble : styles.aiBubble, { backgroundColor: msg.role === 'user' ? colors.primary : colors.surfaceAlt, borderRadius: borderRadius.lg }]}>
            {msg.role === 'assistant' && (
              <View style={styles.aiHeader}>
                <Icon name={icons.mic} size={14} color={colors.primary} />
                <ThemedText variant="caption" style={{ color: colors.primary, fontWeight: '600' }}>{agentName}</ThemedText>
              </View>
            )}
            <ThemedText variant="body" style={{ color: msg.role === 'user' ? '#FFF' : colors.text }}>{msg.content}</ThemedText>
            <ThemedText variant="caption" style={{ color: msg.role === 'user' ? '#FFF8' : colors.textMuted, alignSelf: 'flex-end', marginTop: 4 }}>
              {msg.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </ThemedText>
          </View>
        ))}
        {loading && (
          <View style={[styles.bubble, styles.aiBubble, { backgroundColor: colors.surfaceAlt, borderRadius: borderRadius.lg }]}>
            <View style={styles.typing}>
              {[0, 1, 2].map(i => <View key={i} style={[styles.dot, { backgroundColor: colors.textMuted }]} />)}
            </View>
          </View>
        )}
      </ScrollView>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        <View style={[styles.inputBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <TextInput
            style={[styles.input, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
            value={input} onChangeText={setInput}
            placeholder="Type a message..." placeholderTextColor={colors.textMuted}
            multiline maxLength={500}
          />
          <TouchableOpacity onPress={send} disabled={!input.trim() || loading} style={[styles.sendBtn, { backgroundColor: input.trim() ? colors.primary : colors.surfaceAlt }]}>
            <Icon name={icons.forward} size={20} color={input.trim() ? '#FFF' : colors.textMuted} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, gap: 12 },
  backBtn: { padding: 4 },
  headerInfo: { flex: 1, gap: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  msgs: { flex: 1 },
  msgContent: { padding: 16, gap: 12 },
  bubble: { maxWidth: '85%', padding: 14 },
  userBubble: { alignSelf: 'flex-end' },
  aiBubble: { alignSelf: 'flex-start' },
  aiHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  typing: { flexDirection: 'row', gap: 6, padding: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, borderTopWidth: 1, gap: 8 },
  input: { flex: 1, borderWidth: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 16, maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
