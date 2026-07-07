import { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
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
  const params = useLocalSearchParams<{ phoneNumberId?: string }>();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [aiAgentName, setAiAgentName] = useState('AI Assistant');
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadAIAgent();
    addAIMessage('Hello! I\'m your AI assistant. How can I help you today?');
  }, []);

  const loadAIAgent = async () => {
    if (!currentOrganization) return;
    const { data: agent } = await supabase
      .from('ai_agents')
      .select('name')
      .eq('organization_id', currentOrganization.id)
      .eq('is_active', true)
      .single();
    if (agent) setAiAgentName(agent.name);
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
    if (!input.trim() || !currentOrganization) return;

    const userMessage = input.trim();
    setInput('');

    // Add user message
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    }]);

    setLoading(true);

    // Call AI edge function
    const { data, error } = await callEdgeFunction('ai-voice-conversation', {
      organizationId: currentOrganization.id,
      message: userMessage,
      history: messages.map(m => ({ role: m.role, content: m.content })),
    });

    setLoading(false);

    if (error) {
      addAIMessage('Sorry, I encountered an error. Please try again.');
    } else if (data?.response) {
      addAIMessage(data.response);
    }

    // Scroll to bottom
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const toggleListening = () => {
    if (isListening) {
      setIsListening(false);
      // In production, stop speech recognition and process
    } else {
      setIsListening(true);
      // In production, start speech recognition
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <ThemedView variant="default" style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
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
        {messages.map((msg) => (
          <View
            key={msg.id}
            style={[
              styles.messageBubble,
              msg.role === 'user' ? styles.userBubble : styles.aiBubble,
              {
                backgroundColor: msg.role === 'user' ? colors.primary : colors.surfaceAlt,
                borderRadius: borderRadius.lg,
              },
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
            <ThemedText
              variant="body"
              style={{ color: msg.role === 'user' ? '#FFFFFF' : colors.text }}
            >
              {msg.content}
            </ThemedText>
            <ThemedText
              variant="caption"
              style={{
                color: msg.role === 'user' ? '#FFFFFF80' : colors.textMuted,
                alignSelf: 'flex-end',
                marginTop: 4,
              }}
            >
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

      {/* Voice Controls */}
      <View style={[styles.voiceControls, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.voiceButton,
            {
              backgroundColor: isListening ? colors.error : colors.primary,
              borderRadius: borderRadius.full,
            },
          ]}
          onPress={toggleListening}
        >
          <Icon
            name={isListening ? icons.micOff : icons.mic}
            size={32}
            color="#FFFFFF"
          />
        </TouchableOpacity>
        <ThemedText variant="caption" style={{ color: colors.textMuted }}>
          {isListening ? 'Tap to stop' : 'Tap to speak'}
        </ThemedText>
      </View>

      {/* Text Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
    gap: 12,
  },
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
  voiceControls: {
    alignItems: 'center',
    padding: 20,
    borderTopWidth: 1,
    gap: 8,
  },
  voiceButton: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
