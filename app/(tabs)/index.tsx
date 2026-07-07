import { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, RefreshControl, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeContext } from '../../src/theme/ThemeProvider';
import { useAuthStore, useAppStore } from '../../src/stores';
import { ThemedView, ThemedText, ThemedCard, StatCard, ThemedHeader, Icon, icons } from '../../src/components/ui';

export default function HomeScreen() {
  const { theme } = useThemeContext();
  const { colors } = theme;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, profile, currentOrganization, membership, signOut, loadSession, isLoading } = useAuthStore();
  const {
    phoneNumbers, conversations, calls, voicemails,
    loadPhoneNumbers, loadConversations, loadCalls, loadVoicemails,
    subscribeToMessages, subscribeToCalls,
  } = useAppStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadSession();
  }, []);

  useEffect(() => {
    if (currentOrganization?.id) {
      loadPhoneNumbers(currentOrganization.id);
      loadConversations(currentOrganization.id);
      loadCalls(currentOrganization.id);
      loadVoicemails(currentOrganization.id);

      const unsubMessages = subscribeToMessages(currentOrganization.id);
      const unsubCalls = subscribeToCalls(currentOrganization.id);

      return () => {
        unsubMessages();
        unsubCalls();
      };
    }
  }, [currentOrganization?.id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadSession();
    if (currentOrganization?.id) {
      await Promise.all([
        loadPhoneNumbers(currentOrganization.id),
        loadConversations(currentOrganization.id),
        loadCalls(currentOrganization.id),
        loadVoicemails(currentOrganization.id),
      ]);
    }
    setRefreshing(false);
  }, [currentOrganization?.id]);

  const handleSignOut = async () => {
    await signOut();
    router.replace('/');
  };

  const openConversations = conversations.filter(c => c.status === 'open').length;
  const newVoicemails = voicemails.filter(v => v.status === 'new').length;
  const recentCalls = calls.slice(0, 5);

  if (isLoading) {
    return (
      <ThemedView variant="default" style={[styles.container, styles.centered]}>
        <Icon name={icons.call} size={48} color={colors.primary} />
        <ThemedText variant="subtitle" style={{ marginTop: 16 }}>Loading...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView variant="default" style={styles.container}>
      <ThemedHeader
        title="VoicePlatform"
        subtitle={currentOrganization?.name || 'Welcome back'}
        rightAction={
          <TouchableOpacity onPress={handleSignOut} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Icon name={icons.logOut} size={22} color={colors.error} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.greetingSection}>
          <ThemedText variant="title">
            Hello, {profile?.full_name || user?.email?.split('@')[0] || 'User'}
          </ThemedText>
          {membership && (
            <View style={[styles.roleBadge, { backgroundColor: colors.primary + '20' }]}>
              <ThemedText variant="caption" style={{ color: colors.primary, fontWeight: '600' }}>
                {membership.role}
              </ThemedText>
            </View>
          )}
        </View>

        <View style={styles.statsGrid}>
          <StatCard value={phoneNumbers.length} label="Numbers" />
          <StatCard value={openConversations} label="Open Chats" />
          <StatCard value={newVoicemails} label="Voicemails" color={newVoicemails > 0 ? colors.warning : undefined} />
          <StatCard value={calls.length} label="Calls" />
        </View>

        <ThemedText variant="subtitle" style={styles.sectionTitle}>Quick Actions</ThemedText>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.surfaceAlt }]}
            onPress={() => router.push('/dialpad')}
          >
            <Icon name={icons.call} size={28} color={colors.primary} />
            <ThemedText variant="body" weight="600" align="center">Make Call</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.surfaceAlt }]}
            onPress={() => router.push('/ai-voice')}
          >
            <Icon name={icons.mic} size={28} color={colors.primary} />
            <ThemedText variant="body" weight="600" align="center">AI Voice</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.surfaceAlt }]}
            onPress={() => router.push('/(tabs)/messages')}
          >
            <Icon name={icons.chat} size={28} color={colors.primary} />
            <ThemedText variant="body" weight="600" align="center">Messages</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.surfaceAlt }]}
            onPress={() => router.push('/(tabs)/voicemail')}
          >
            <Icon name={icons.mail} size={28} color={colors.primary} />
            <ThemedText variant="body" weight="600" align="center">Voicemail</ThemedText>
          </TouchableOpacity>
        </View>

        {recentCalls.length > 0 && (
          <>
            <ThemedText variant="subtitle" style={styles.sectionTitle}>Recent Calls</ThemedText>
            {recentCalls.map((call) => (
              <TouchableOpacity
                key={call.id}
                style={[styles.callItem, { backgroundColor: colors.surfaceAlt }]}
                onPress={() => router.push('/(tabs)/calls')}
              >
                <View style={[styles.callAvatar, { backgroundColor: colors.surface }]}>
                  <Icon name={call.direction === 'inbound' ? icons.call : icons.phoneFilled} size={20} color={colors.primary} />
                </View>
                <View style={styles.callInfo}>
                  <ThemedText variant="body" weight="600">
                    {call.contacts?.name || call.from_number || call.to_number}
                  </ThemedText>
                  <ThemedText variant="caption">
                    {call.direction === 'inbound' ? 'Incoming' : 'Outgoing'} • {call.status}
                  </ThemedText>
                </View>
                <ThemedText variant="caption">
                  {new Date(call.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </>
        )}

        {phoneNumbers.length > 0 && (
          <>
            <ThemedText variant="subtitle" style={styles.sectionTitle}>Your Numbers</ThemedText>
            {phoneNumbers.map((num) => (
              <TouchableOpacity
                key={num.id}
                style={[styles.numberItem, { backgroundColor: colors.surfaceAlt }]}
                onPress={() => router.push('/(tabs)/settings/numbers')}
              >
                <Icon name={icons.phonePortrait} size={20} color={colors.primary} />
                <View style={styles.numberInfo}>
                  <ThemedText variant="body" weight="600">{num.formatted_number}</ThemedText>
                  <ThemedText variant="caption">{num.friendly_name || num.type}</ThemedText>
                </View>
                <View style={[styles.statusDot, { backgroundColor: num.status === 'purchased' ? colors.success : colors.primary }]} />
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 16, paddingBottom: 24 },
  greetingSection: { marginBottom: 24, gap: 8 },
  roleBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 28 },
  sectionTitle: { marginBottom: 16 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 28 },
  actionCard: {
    width: '47%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: 16,
    gap: 8,
  },
  callItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  callAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  callInfo: { flex: 1, gap: 2 },
  numberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  numberInfo: { flex: 1, gap: 2 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
});
