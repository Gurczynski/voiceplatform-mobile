import { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, RefreshControl, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeContext } from '../../src/theme/ThemeProvider';
import { useAuthStore, useAppStore } from '../../src/stores';
import { ThemedView, ThemedText, ThemedCard, StatCard, ThemedHeader, Icon, icons } from '../../src/components/ui';

export default function HomeScreen() {
  const { theme } = useThemeContext();
  const { colors, spacing, fontSize, borderRadius } = theme;
  const router = useRouter();
  const { user, profile, currentOrganization, membership, signOut, loadSession } = useAuthStore();
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
    if (currentOrganization) {
      loadPhoneNumbers(currentOrganization.id);
      loadConversations(currentOrganization.id);
      loadCalls(currentOrganization.id);
      loadVoicemails(currentOrganization.id);

      // Subscribe to realtime updates
      const unsubMessages = subscribeToMessages(currentOrganization.id);
      const unsubCalls = subscribeToCalls(currentOrganization.id);

      return () => {
        unsubMessages();
        unsubCalls();
      };
    }
  }, [currentOrganization]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadSession();
    if (currentOrganization) {
      await Promise.all([
        loadPhoneNumbers(currentOrganization.id),
        loadConversations(currentOrganization.id),
        loadCalls(currentOrganization.id),
        loadVoicemails(currentOrganization.id),
      ]);
    }
    setRefreshing(false);
  }, [currentOrganization]);

  const handleSignOut = async () => {
    await signOut();
    router.replace('/');
  };

  const openConversations = conversations.filter((c) => c.status === 'open').length;
  const newVoicemails = voicemails.filter((v) => v.status === 'new').length;
  const recentCalls = calls.slice(0, 5);

  return (
    <ThemedView variant="default" style={styles.container}>
      <ThemedHeader
        title="VoicePlatform"
        subtitle={currentOrganization?.name || 'Welcome back'}
        rightAction={
          <TouchableOpacity onPress={handleSignOut}>
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
            <View style={[styles.roleBadge, { backgroundColor: colors.surfaceAlt }]}>
              <ThemedText variant="caption" style={{ color: colors.primary }}>{membership.role}</ThemedText>
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
          <ThemedCard variant="elevated" padding="md" onPress={() => router.push('/dialpad')} style={styles.actionCard}>
            <Icon name={icons.call} size={28} color={colors.primary} />
            <ThemedText variant="body" weight="600" align="center">Make Call</ThemedText>
          </ThemedCard>
          <ThemedCard variant="elevated" padding="md" onPress={() => router.push('/(tabs)/messages')} style={styles.actionCard}>
            <Icon name={icons.chat} size={28} color={colors.primary} />
            <ThemedText variant="body" weight="600" align="center">Messages</ThemedText>
          </ThemedCard>
          <ThemedCard variant="elevated" padding="md" onPress={() => router.push('/(tabs)/contacts')} style={styles.actionCard}>
            <Icon name={icons.people} size={28} color={colors.primary} />
            <ThemedText variant="body" weight="600" align="center">Contacts</ThemedText>
          </ThemedCard>
          <ThemedCard variant="elevated" padding="md" onPress={() => router.push('/(tabs)/settings')} style={styles.actionCard}>
            <Icon name={icons.settings} size={28} color={colors.primary} />
            <ThemedText variant="body" weight="600" align="center">Settings</ThemedText>
          </ThemedCard>
        </View>

        {recentCalls.length > 0 && (
          <>
            <ThemedText variant="subtitle" style={styles.sectionTitle}>Recent Calls</ThemedText>
            {recentCalls.map((call) => (
              <ThemedCard key={call.id} variant="outlined" padding="md" style={styles.callItem}>
                <View style={styles.callRow}>
                  <View style={[styles.callAvatar, { backgroundColor: colors.surfaceAlt }]}>
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
                </View>
              </ThemedCard>
            ))}
          </>
        )}

        {phoneNumbers.length > 0 && (
          <>
            <ThemedText variant="subtitle" style={styles.sectionTitle}>Your Numbers</ThemedText>
            {phoneNumbers.map((num) => (
              <ThemedCard key={num.id} variant="outlined" padding="md" style={styles.numberItem}>
                <View style={styles.callRow}>
                  <Icon name={icons.phonePortrait} size={20} color={colors.primary} />
                  <View>
                    <ThemedText variant="body" weight="600">{num.formatted_number}</ThemedText>
                    <ThemedText variant="caption">{num.friendly_name || num.type}</ThemedText>
                  </View>
                </View>
              </ThemedCard>
            ))}
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  greetingSection: { marginBottom: 24 },
  roleBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginTop: 8 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 28 },
  sectionTitle: { marginBottom: 16 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 28 },
  actionCard: { width: '47%', alignItems: 'center', gap: 8 },
  callItem: { marginBottom: 8 },
  callRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  callAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  callInfo: { flex: 1 },
  numberItem: { marginBottom: 8 },
});
