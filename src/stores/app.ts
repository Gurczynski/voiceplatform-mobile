// App Store - Complete app data with Edge Functions and Realtime
import { create } from 'zustand';
import { supabase, callEdgeFunction, subscribeToTable } from '../lib/supabase';
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

  // Data loading
  loadPhoneNumbers: (orgId: string) => Promise<void>;
  loadConversations: (orgId: string) => Promise<void>;
  loadCalls: (orgId: string) => Promise<void>;
  loadVoicemails: (orgId: string) => Promise<void>;
  loadContacts: (orgId: string) => Promise<void>;

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
  contacts: [],
  selectedConversation: null,
  activeCall: null,
  isLoadingNumbers: false,
  isLoadingConversations: false,
  isLoadingCalls: false,
  isLoadingContacts: false,

  loadPhoneNumbers: async (orgId) => {
    set({ isLoadingNumbers: true });
    try {
      const { data, error } = await supabase
        .from('phone_numbers')
        .select('*')
        .eq('organization_id', orgId)
        .in('status', ['purchased', 'assigned'])
        .order('created_at', { ascending: false });

      if (error) console.error('Error loading phone numbers:', error);
      set({ phoneNumbers: data || [], isLoadingNumbers: false });
    } catch (e) {
      console.error('Error:', e);
      set({ isLoadingNumbers: false });
    }
  },

  loadConversations: async (orgId) => {
    set({ isLoadingConversations: true });
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*, contacts(*), phone_numbers(*)')
        .eq('organization_id', orgId)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (error) console.error('Error loading conversations:', error);
      set({ conversations: (data || []) as Conversation[], isLoadingConversations: false });
    } catch (e) {
      console.error('Error:', e);
      set({ isLoadingConversations: false });
    }
  },

  loadCalls: async (orgId) => {
    set({ isLoadingCalls: true });
    try {
      const { data, error } = await supabase
        .from('calls')
        .select('*, contacts(*), phone_numbers(*)')
        .eq('organization_id', orgId)
        .order('started_at', { ascending: false })
        .limit(100);

      if (error) console.error('Error loading calls:', error);
      set({ calls: (data || []) as Call[], isLoadingCalls: false });
    } catch (e) {
      console.error('Error:', e);
      set({ isLoadingCalls: false });
    }
  },

  loadVoicemails: async (orgId) => {
    try {
      const { data, error } = await supabase
        .from('voicemail_messages')
        .select('*, contacts(*)')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) console.error('Error loading voicemails:', error);
      set({ voicemails: (data || []) as VoicemailMessage[] });
    } catch (e) {
      console.error('Error:', e);
    }
  },

  loadContacts: async (orgId) => {
    set({ isLoadingContacts: true });
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('organization_id', orgId)
        .order('name', { ascending: true });

      if (error) console.error('Error loading contacts:', error);
      set({ contacts: (data || []) as Contact[], isLoadingContacts: false });
    } catch (e) {
      console.error('Error:', e);
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

      if (data?.message) {
        const { conversations } = get();
        set({
          conversations: conversations.map(c =>
            c.id === data.message.conversation_id
              ? { ...c, last_message_at: data.message.created_at, last_message_preview: body.slice(0, 100) }
              : c
          ),
        });
      }

      return {};
    } catch (e: any) {
      return { error: e.message || 'Failed to send message' };
    }
  },

  searchNumbers: async (orgId, options) => {
    try {
      const { data, error } = await callEdgeFunction('search-available-numbers', {
        organizationId: orgId,
        countryCode: 'US',
        areaCode: options?.areaCode,
        type: options?.type,
        capabilities: { voice: true, sms: true, mms: true },
      });

      if (error) return { error };
      return { data: data?.numbers || [] };
    } catch (e: any) {
      return { error: e.message || 'Search failed' };
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
      return { error: e.message || 'Purchase failed' };
    }
  },

  subscribeToMessages: (orgId) => {
    const channel = supabase
      .channel(`messages:${orgId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: undefined },
        (payload) => {
          const newMessage = payload.new as Message;
          const { conversations } = get();

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
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  },

  subscribeToCalls: (orgId) => {
    const channel = supabase
      .channel(`calls:${orgId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'calls', filter: undefined },
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

    return () => { supabase.removeChannel(channel); };
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
    set({ conversations: conversations.map(c => c.id === id ? { ...c, ...updates } : c) });
  },
}));
