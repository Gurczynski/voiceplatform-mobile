import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Organization, UserProfile, OrganizationMember, PhoneNumber, Conversation, Message, Call, VoicemailMessage } from '../types';

interface AuthState {
  user: any | null;
  session: any | null;
  profile: UserProfile | null;
  organizations: Organization[];
  currentOrganization: Organization | null;
  membership: OrganizationMember | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  loadSession: () => Promise<void>;
  switchOrganization: (orgId: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  organizations: [],
  currentOrganization: null,
  membership: null,
  isLoading: true,

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    set({ user: data.user, session: data.session });
    await get().loadSession();
    return {};
  },

  signUp: async (email, password, fullName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) return { error: error.message };
    set({ user: data.user, session: data.session });
    return {};
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({
      user: null,
      session: null,
      profile: null,
      organizations: [],
      currentOrganization: null,
      membership: null,
    });
  },

  loadSession: async () => {
    set({ isLoading: true });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        set({ isLoading: false });
        return;
      }

      set({ user: session.user, session });

      // Load profile
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      // Load organizations
      const { data: memberships } = await supabase
        .from('organization_members')
        .select('*, organizations(*)')
        .eq('user_id', session.user.id)
        .eq('is_active', true);

      const orgs = memberships?.map(m => m.organizations).filter(Boolean) || [];
      const currentOrg = orgs[0] || null;
      const currentMembership = memberships?.[0] || null;

      set({
        profile: profile || null,
        organizations: orgs as Organization[],
        currentOrganization: currentOrg as Organization,
        membership: currentMembership as OrganizationMember,
        isLoading: false,
      });
    } catch (e) {
      set({ isLoading: false });
    }
  },

  switchOrganization: async (orgId) => {
    const { organizations } = get();
    const org = organizations.find(o => o.id === orgId);
    if (org) {
      const { data: membership } = await supabase
        .from('organization_members')
        .select('*')
        .eq('organization_id', orgId)
        .eq('user_id', get().user?.id)
        .single();
      set({ currentOrganization: org, membership: membership as OrganizationMember });
    }
  },

  refreshProfile: async () => {
    const { user } = get();
    if (!user) return;
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    set({ profile: profile || null });
  },
}));

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
  loadPhoneNumbers: (orgId: string) => Promise<void>;
  loadConversations: (orgId: string) => Promise<void>;
  loadCalls: (orgId: string) => Promise<void>;
  loadVoicemails: (orgId: string) => Promise<void>;
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
