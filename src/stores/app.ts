// App Store - Complete with working realtime, calls, messages, AI
import { create } from 'zustand';
import { supabase, callEdgeFunction } from '../lib/supabase';
import type { PhoneNumber, Conversation, Message, Call, VoicemailMessage, Contact } from '../types';

interface AppState {
  phoneNumbers: PhoneNumber[];
  conversations: Conversation[];
  calls: Call[];
  voicemails: VoicemailMessage[];
  contacts: Contact[];
  selectedConversation: Conversation | null;
  activeCall: Call | null;
  isLoadingNumbers: boolean;
  isLoadingConversations: boolean;
  isLoadingCalls: boolean;
  isLoadingContacts: boolean;
  realtimeChannels: any[];

  loadPhoneNumbers: (orgId: string) => Promise<void>;
  loadConversations: (orgId: string) => Promise<void>;
  loadCalls: (orgId: string) => Promise<void>;
  loadVoicemails: (orgId: string) => Promise<void>;
  loadContacts: (orgId: string) => Promise<void>;
  sendMessage: (orgId: string, phoneNumberId: string, to: string, body: string, mediaUrls?: string[]) => Promise<{ error?: string }>;
  searchNumbers: (orgId: string, options?: { areaCode?: string; type?: string }) => Promise<{ data?: any[]; error?: string }>;
  buyNumber: (orgId: string, phoneNumber: string, friendlyName?: string) => Promise<{ error?: string }>;
  subscribeToRealtime: (orgId: string) => () => void;
  setSelectedConversation: (conv: Conversation | null) => void;
  setActiveCall: (call: Call | null) => void;
  cleanup: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  phoneNumbers: [],
  conversations: [],
  calls: [],
  voicemails: [],
  contacts: [],
  selectedConversation: null,
  activeCall: null,
  isLoadingNumbers: false,
  isLoadingConversations: false,
  isLoadingCalls: false,
  isLoadingContacts: false,
  realtimeChannels: [],

  loadPhoneNumbers: async (orgId) => {
    set({ isLoadingNumbers: true });
    try {
      const { data } = await supabase
        .from('phone_numbers')
        .select('*')
        .eq('organization_id', orgId)
        .in('status', ['purchased', 'assigned'])
        .order('created_at', { ascending: false });
      set({ phoneNumbers: data || [], isLoadingNumbers: false });
    } catch (e) {
      set({ isLoadingNumbers: false });
    }
  },

  loadConversations: async (orgId) => {
    set({ isLoadingConversations: true });
    try {
      const { data } = await supabase
        .from('conversations')
        .select('*, contacts(*), phone_numbers(*)')
        .eq('organization_id', orgId)
        .order('last_message_at', { ascending: false, nullsFirst: false });
      set({ conversations: (data || []) as Conversation[], isLoadingConversations: false });
    } catch (e) {
      set({ isLoadingConversations: false });
    }
  },

  loadCalls: async (orgId) => {
    set({ isLoadingCalls: true });
    try {
      const { data } = await supabase
        .from('calls')
        .select('*, contacts(*), phone_numbers(*)')
        .eq('organization_id', orgId)
        .order('started_at', { ascending: false })
        .limit(100);
      set({ calls: (data || []) as Call[], isLoadingCalls: false });
    } catch (e) {
      set({ isLoadingCalls: false });
    }
  },

  loadVoicemails: async (orgId) => {
    try {
      const { data } = await supabase
        .from('voicemail_messages')
        .select('*, contacts(*)')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(50);
      set({ voicemails: (data || []) as VoicemailMessage[] });
    } catch (e) {}
  },

  loadContacts: async (orgId) => {
    set({ isLoadingContacts: true });
    try {
      const { data } = await supabase
        .from('contacts')
        .select('*')
        .eq('organization_id', orgId)
        .order('name', { ascending: true });
      set({ contacts: (data || []) as Contact[], isLoadingContacts: false });
    } catch (e) {
      set({ isLoadingContacts: false });
    }
  },

  sendMessage: async (orgId, phoneNumberId, to, body, mediaUrls) => {
    try {
      const { data, error } = await callEdgeFunction('send-message', {
        organizationId: orgId,
        phoneNumberId,
        to,
        body,
        mediaUrls,
      });
      if (error) return { error };
      return {};
    } catch (e: any) {
      return { error: e.message || 'Failed to send' };
    }
  },

  searchNumbers: async (orgId, options) => {
    try {
      const { data, error } = await callEdgeFunction('search-available-numbers', {
        organizationId: orgId,
        countryCode: 'US',
        areaCode: options?.areaCode,
        capabilities: { voice: true, sms: true, mms: true },
      });
      if (error) return { error };
      return { data: data?.numbers || [] };
    } catch (e: any) {
      return { error: e.message };
    }
  },

  buyNumber: async (orgId, phoneNumber, friendlyName) => {
    try {
      const { data, error } = await callEdgeFunction('buy-number', {
        organizationId: orgId,
        phoneNumber,
        friendlyName,
      });
      if (error) return { error };
      await get().loadPhoneNumbers(orgId);
      return {};
    } catch (e: any) {
      return { error: e.message };
    }
  },

  subscribeToRealtime: (orgId) => {
    // Cleanup existing channels
    get().cleanup();

    const messagesChannel = supabase
      .channel(`realtime-messages-${orgId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMsg = payload.new as Message;
          const { conversations } = get();
          set({
            conversations: conversations.map(c =>
              c.id === newMsg.conversation_id
                ? { ...c, last_message_at: newMsg.created_at, last_message_preview: newMsg.body?.slice(0, 100), unread_count: c.unread_count + (newMsg.direction === 'inbound' ? 1 : 0) }
                : c
            ),
          });
        }
      )
      .subscribe();

    const callsChannel = supabase
      .channel(`realtime-calls-${orgId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'calls' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            set({ calls: [payload.new as Call, ...get().calls] });
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Call;
            set({ calls: get().calls.map(c => c.id === updated.id ? updated : c) });
          }
        }
      )
      .subscribe();

    set({ realtimeChannels: [messagesChannel, callsChannel] });

    return () => {
      get().cleanup();
    };
  },

  cleanup: () => {
    const { realtimeChannels } = get();
    realtimeChannels.forEach(ch => {
      try { supabase.removeChannel(ch); } catch (e) {}
    });
    set({ realtimeChannels: [] });
  },

  setSelectedConversation: (conv) => set({ selectedConversation: conv }),
  setActiveCall: (call) => set({ activeCall: call }),
}));
