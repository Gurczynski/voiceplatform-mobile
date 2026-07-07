// AI Voice - Real AI conversations via Edge Function
import { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeContext } from '../src/theme/ThemeProvider';
import { useAuthStore } from '../src/stores';
import { supabase, callEdgeFunction } from '../src/lib/supabase';
import { ThemedView, ThemedText, Icon, icons } from '../src/components/ui';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function AIVoiceScreen() {
  const { theme } = useThemeContext();
  const { colors, borderRadius } = theme;
  const { currentOrganization } = useAuthStore();
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiAgentName, setAiAgentName] = useState('AI Assistant');
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadAIAgent();
    addAIMessage('Hello! I\'m your AI assistant. How can I help you today?');
  }, []);

  const loadAIAgent = async () => {
    if (!currentOrganization?.id) return;
    const { data: agent } = await supabase
      .from('ai_agents')
      .select('name, greeting')
      .eq('organization_id', currentOrganization.id)
      .eq('is_active', true)
      .single();
    if (agent) {
      setAiAgentName(agent.name);
      if (agent.greeting) {
        setMessages([{
          id: '1',
          role: 'assistant',
          content: agent.greeting,
          timestamp: new Date(),
        }]);
      }
    }
  };

  const addAIMessage = (content: string) => {
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'assistant',
      content,
      timestamp: new Date(),
    }]);
  };

  const handleSend = async () => {
    if (!input.trim() || !currentOrganization?.id) return;

    const userMessage = input.trim();
    setInput('');

    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    }]);

    setLoading(true);

    try {
      const { data, error } = await callEdgeFunction('ai-voice-conversation', {
        organizationId: currentOrganization.id,
        message: userMessage,
        history: messages.map(m => ({ role: m.role, content: m.content })),
      });

      if (error) {
        addAIMessage('Sorry, I encountered an error. Please try again.');
      } else if (data?.response) {
        addAIMessage(data.response);
      } else {
        addAIMessage('I\'m here to help. Could you tell me more about what you need?');
      }
    } catch (e) {
      addAIMessage('Sorry, I\'m having trouble connecting. Please try again.');
    }

    setLoading(false);

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <ThemedView variant="default" style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border, paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name={icons.back} size={24} color={colors.icon} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <ThemedText variant="subtitle">{aiAgentName}</ThemedText>
          <ThemedText variant="caption" style={{ color: colors.success }}>AI Voice Assistant</ThemedText>
        </View>
        <View style={[styles.aiBadge, { backgroundColor: colors.primary }]}>
          <ThemedText variant="caption" style={{ color: '#FFFFFF' }}>AI</ThemedText>
        </View>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map(msg => (
          <View
            key={msg.id}
            style={[
              styles.messageBubble,
              msg.role === 'user' ? styles.userBubble : styles.aiBubble,
              { backgroundColor: msg.role === 'user' ? colors.primary : colors.surfaceAlt, borderRadius: borderRadius.lg },
            ]}
          >
            {msg.role === 'assistant' && (
              <View style={styles.aiMessageHeader}>
                <Icon name={icons.mic} size={14} color={colors.primary} />
                <ThemedText variant="caption" style={{ color: colors.primary, fontWeight: '600' }}>
                  {aiAgentName}
                </ThemedText>
              </View>
            )}
            <ThemedText variant="body" style={{ color: msg.role === 'user' ? '#FFFFFF' : colors.text }}>
              {msg.content}
            </ThemedText>
            <ThemedText variant="caption" style={{ color: msg.role === 'user' ? '#FFFFFF80' : colors.textMuted, alignSelf: 'flex-end', marginTop: 4 }}>
              {formatTime(msg.timestamp)}
            </ThemedText>
          </View>
        ))}

        {loading && (
          <View style={[styles.messageBubble, styles.aiBubble, { backgroundColor: colors.surfaceAlt, borderRadius: borderRadius.lg }]}>
            <View style={styles.typingIndicator}>
              <View style={[styles.typingDot, { backgroundColor: colors.textMuted }]} />
              <View style={[styles.typingDot, { backgroundColor: colors.textMuted }]} />
              <View style={[styles.typingDot, { backgroundColor: colors.textMuted }]} />
            </View>
          </View>
        )}
      </ScrollView>

      {/* Text Input */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <TextInput
            style={[styles.textInput, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
            value={input}
            onChangeText={setInput}
            placeholder="Type a message..."
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!input.trim() || loading}
            style={[styles.sendButton, { backgroundColor: input.trim() ? colors.primary : colors.surfaceAlt }]}
          >
            <Icon name={icons.forward} size={20} color={input.trim() ? '#FFFFFF' : colors.textMuted} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, gap: 12 },
  backButton: { padding: 4 },
  headerInfo: { flex: 1, gap: 2 },
  aiBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  messagesContainer: { flex: 1 },
  messagesContent: { padding: 16, gap: 12 },
  messageBubble: { maxWidth: '85%', padding: 14 },
  userBubble: { alignSelf: 'flex-end' },
  aiBubble: { alignSelf: 'flex-start' },
  aiMessageHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  typingIndicator: { flexDirection: 'row', gap: 6, padding: 8 },
  typingDot: { width: 8, height: 8, borderRadius: 4 },
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, borderTopWidth: 1, gap: 8 },
  textInput: { flex: 1, borderWidth: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 16, maxHeight: 100 },
  sendButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
