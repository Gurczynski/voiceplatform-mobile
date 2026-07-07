// App Store - Handles app data with Edge Functions and Realtime
import { create } from 'zustand';
import { supabase, callEdgeFunction, subscribeToTable } from '../lib/supabase';
import type { PhoneNumber, Conversation, Message, Call, VoicemailMessage } from '../types';

interface AppState {
  phoneNumbers: PhoneNumber[];
  conversations: Conversation[];
  calls: Call[];
  voicemails: VoicemailMessage[];
  selectedConversation: Conversation | null;
  activeCall: Call | null;
  isLoadingNumbers: boolean;
  isLoadingConversations: boolean;
  isLoadingCalls: boolean;

  // Data loading
  loadPhoneNumbers: (orgId: string) => Promise<void>;
  loadConversations: (orgId: string) => Promise<void>;
  loadCalls: (orgId: string) => Promise<void>;
  loadVoicemails: (orgId: string) => Promise<void>;

  // Edge function operations
  sendMessage: (orgId: string, phoneNumberId: string, to: string, body: string, mediaUrls?: string[]) => Promise<{ error?: string }>;
  searchNumbers: (orgId: string, options?: { areaCode?: string; type?: string }) => Promise<{ data?: any[]; error?: string }>;
  buyNumber: (orgId: string, phoneNumber: string, friendlyName?: string) => Promise<{ error?: string }>;

  // Realtime
  subscribeToMessages: (orgId: string) => () => void;
  subscribeToCalls: (orgId: string) => () => void;

  // Setters
  setSelectedConversation: (conv: Conversation | null) => void;
  setActiveCall: (call: Call | null) => void;
  addMessage: (conversationId: string, message: Message) => void;
  updateConversation: (id: string, updates: Partial<Conversation>) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  phoneNumbers: [],
  conversations: [],
  calls: [],
  voicemails: [],
  selectedConversation: null,
  activeCall: null,
  isLoadingNumbers: false,
  isLoadingConversations: false,
  isLoadingCalls: false,

  loadPhoneNumbers: async (orgId) => {
    set({ isLoadingNumbers: true });
    const { data } = await supabase
      .from('phone_numbers')
      .select('*')
      .eq('organization_id', orgId)
      .in('status', ['purchased', 'assigned'])
      .order('created_at', { ascending: false });
    set({ phoneNumbers: data || [], isLoadingNumbers: false });
  },

  loadConversations: async (orgId) => {
    set({ isLoadingConversations: true });
    const { data } = await supabase
      .from('conversations')
      .select('*, contacts(*), phone_numbers(*)')
      .eq('organization_id', orgId)
      .order('last_message_at', { ascending: false, nullsFirst: false });
    set({ conversations: (data || []) as Conversation[], isLoadingConversations: false });
  },

  loadCalls: async (orgId) => {
    set({ isLoadingCalls: true });
    const { data } = await supabase
      .from('calls')
      .select('*, contacts(*), phone_numbers(*)')
      .eq('organization_id', orgId)
      .order('started_at', { ascending: false })
      .limit(100);
    set({ calls: (data || []) as Call[], isLoadingCalls: false });
  },

  loadVoicemails: async (orgId) => {
    const { data } = await supabase
      .from('voicemail_messages')
      .select('*, contacts(*)')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(50);
    set({ voicemails: (data || []) as VoicemailMessage[] });
  },

  // Send message via Edge Function (never direct Twilio)
  sendMessage: async (orgId, phoneNumberId, to, body, mediaUrls) => {
    const { data, error } = await callEdgeFunction('send-message', {
      organizationId: orgId,
      phoneNumberId,
      to,
      body,
      mediaUrls,
    });

    if (error) return { error };

    // Optimistically update conversation
    if (data?.message) {
      const { conversations } = get();
      const conv = conversations.find(c => c.id === data.message.conversation_id);
      if (conv) {
        set({
          conversations: conversations.map(c =>
            c.id === conv.id
              ? { ...c, last_message_at: data.message.created_at, last_message_preview: body.slice(0, 100) }
              : c
          ),
        });
      }
    }

    return {};
  },

  // Search available numbers via Edge Function
  searchNumbers: async (orgId, options) => {
    const { data, error } = await callEdgeFunction('search-available-numbers', {
      organizationId: orgId,
      countryCode: 'US',
      areaCode: options?.areaCode,
      type: options?.type,
      capabilities: { voice: true, sms: true, mms: true },
    });

    if (error) return { error };
    return { data: data?.numbers || [] };
  },

  // Buy number via Edge Function
  buyNumber: async (orgId, phoneNumber, friendlyName) => {
    const { data, error } = await callEdgeFunction('buy-number', {
      organizationId: orgId,
      phoneNumber,
      friendlyName,
    });

    if (error) return { error };

    // Reload phone numbers
    await get().loadPhoneNumbers(orgId);
    return {};
  },

  // Subscribe to realtime message updates
  subscribeToMessages: (orgId) => {
    const channel = subscribeToTable('messages', `organization_id=eq.${orgId}`, (payload) => {
      if (payload.eventType === 'INSERT') {
        const newMessage = payload.new as Message;
        const { conversations } = get();

        // Update the conversation
        set({
          conversations: conversations.map(c =>
            c.id === newMessage.conversation_id
              ? {
                  ...c,
                  last_message_at: newMessage.created_at,
                  last_message_preview: newMessage.body?.slice(0, 100),
                  unread_count: c.unread_count + (newMessage.direction === 'inbound' ? 1 : 0),
                }
              : c
          ),
        });
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  },

  // Subscribe to realtime call updates
  subscribeToCalls: (orgId) => {
    const channel = subscribeToTable('calls', `organization_id=eq.${orgId}`, (payload) => {
      if (payload.eventType === 'INSERT') {
        const newCall = payload.new as Call;
        set({ calls: [newCall, ...get().calls] });
      } else if (payload.eventType === 'UPDATE') {
        const updatedCall = payload.new as Call;
        set({
          calls: get().calls.map(c => c.id === updatedCall.id ? updatedCall : c),
        });
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  },

  setSelectedConversation: (conv) => set({ selectedConversation: conv }),
  setActiveCall: (call) => set({ activeCall: call }),

  addMessage: (conversationId, message) => {
    const { conversations } = get();
    set({
      conversations: conversations.map(c =>
        c.id === conversationId
          ? { ...c, last_message_at: message.created_at, last_message_preview: message.body?.slice(0, 100) }
          : c
      ),
    });
  },

  updateConversation: (id, updates) => {
    const { conversations } = get();
    set({
      conversations: conversations.map(c => c.id === id ? { ...c, ...updates } : c),
    });
  },
}));
