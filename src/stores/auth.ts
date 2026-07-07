// Auth Store - Handles authentication and organization management
import { create } from 'zustand';
import { supabase, callEdgeFunction } from '../lib/supabase';
import type { Organization, UserProfile, OrganizationMember } from '../types';

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
  createOrganization: (name: string, industry?: string) => Promise<{ error?: string }>;
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

  createOrganization: async (name, industry) => {
    const { data, error } = await callEdgeFunction('create-organization', {
      name,
      industry,
      mode: 'managed',
    });

    if (error) return { error };

    // Reload session to pick up new org
    await get().loadSession();
    return {};
  },
}));
