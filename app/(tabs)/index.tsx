// Home Dashboard - Professional Quality
import { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, RefreshControl, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeContext } from '../../src/theme/ThemeProvider';
import { useAuthStore, useAppStore } from '../../src/stores';
import { ThemedView, ThemedText, ThemedHeader, Icon, icons } from '../../src/components/ui';

export default function HomeScreen() {
  const { theme } = useThemeContext();
  const { colors } = theme;
  const router = useRouter();
  const { user, profile, currentOrganization, membership, signOut, loadSession, isLoading } = useAuthStore();
  const {
    phoneNumbers, conversations, calls, voicemails,
    loadPhoneNumbers, loadConversations, loadCalls, loadVoicemails,
    subscribeToRealtime,
  } = useAppStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadSession(); }, []);

  useEffect(() => {
    if (currentOrganization?.id) {
      loadPhoneNumbers(currentOrganization.id);
      loadConversations(currentOrganization.id);
      loadCalls(currentOrganization.id);
      loadVoicemails(currentOrganization.id);
      const unsub = subscribeToRealtime(currentOrganization.id);
      return unsub;
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

  const openConversations = conversations.filter(c => c.status === 'open').length;
  const newVoicemails = voicemails.filter(v => v.status === 'new').length;
  const recentCalls = calls.slice(0, 5);

  if (isLoading) {
    return (
      <ThemedView variant="default" style={[styles.container, styles.centered]}>
        <Text style={{ color: colors.primary, fontSize: 48 }}>📞</Text>
        <Text style={[styles.loadingText, { color: colors.text }]}>Loading...</Text>
      </ThemedView>
    );
  }

  return (
    <ThemedView variant="default" style={styles.container}>
      <ThemedHeader
        title="VoicePlatform"
        subtitle={currentOrganization?.name || 'Welcome back'}
        rightAction={
          <TouchableOpacity onPress={() => router.push('/(tabs)/settings')} style={[styles.menuBtn, { backgroundColor: colors.surfaceAlt }]}>
            <Icon name={icons.menu} size={20} color={colors.icon} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />} showsVerticalScrollIndicator={false}>
        {/* Greeting */}
        <View style={styles.greeting}>
          <Text style={[styles.hello, { color: colors.text }]}>
            Hello, {profile?.full_name || user?.email?.split('@')[0] || 'User'} 👋
          </Text>
          {membership && (
            <View style={[styles.roleBadge, { backgroundColor: colors.primary + '15' }]}>
              <Text style={[styles.roleText, { color: colors.primary }]}>{membership.role}</Text>
            </View>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <TouchableOpacity style={[styles.statCard, { backgroundColor: colors.surfaceAlt }]} onPress={() => router.push('/(tabs)/settings/numbers')}>
            <Text style={[styles.statNum, { color: colors.primary }]}>{phoneNumbers.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Numbers</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.statCard, { backgroundColor: colors.surfaceAlt }]} onPress={() => router.push('/(tabs)/messages')}>
            <Text style={[styles.statNum, { color: colors.primary }]}>{openConversations}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Open</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.statCard, { backgroundColor: colors.surfaceAlt }]} onPress={() => router.push('/(tabs)/voicemail')}>
            <Text style={[styles.statNum, { color: newVoicemails > 0 ? colors.warning : colors.primary }]}>{newVoicemails}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Voicemail</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.statCard, { backgroundColor: colors.surfaceAlt }]} onPress={() => router.push('/(tabs)/calls')}>
            <Text style={[styles.statNum, { color: colors.primary }]}>{calls.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Calls</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity style={[styles.actionCard, { backgroundColor: colors.surfaceAlt }]} onPress={() => router.push('/dialpad')}>
            <View style={[styles.actionIcon, { backgroundColor: '#3B82F615' }]}>
              <Icon name={icons.call} size={24} color="#3B82F6" />
            </View>
            <Text style={[styles.actionLabel, { color: colors.text }]}>Make Call</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionCard, { backgroundColor: colors.surfaceAlt }]} onPress={() => router.push('/ai-voice')}>
            <View style={[styles.actionIcon, { backgroundColor: '#EC489915' }]}>
              <Icon name={icons.mic} size={24} color="#EC4899" />
            </View>
            <Text style={[styles.actionLabel, { color: colors.text }]}>AI Voice</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionCard, { backgroundColor: colors.surfaceAlt }]} onPress={() => router.push('/(tabs)/messages')}>
            <View style={[styles.actionIcon, { backgroundColor: '#10B98115' }]}>
              <Icon name={icons.chat} size={24} color="#10B981" />
            </View>
            <Text style={[styles.actionLabel, { color: colors.text }]}>Messages</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionCard, { backgroundColor: colors.surfaceAlt }]} onPress={() => router.push('/(tabs)/voicemail')}>
            <View style={[styles.actionIcon, { backgroundColor: '#8B5CF615' }]}>
              <Icon name={icons.mic} size={24} color="#8B5CF6" />
            </View>
            <Text style={[styles.actionLabel, { color: colors.text }]}>Voicemail</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionCard, { backgroundColor: colors.surfaceAlt }]} onPress={() => router.push('/(tabs)/contacts')}>
            <View style={[styles.actionIcon, { backgroundColor: '#F59E0B15' }]}>
              <Icon name={icons.people} size={24} color="#F59E0B" />
            </View>
            <Text style={[styles.actionLabel, { color: colors.text }]}>Contacts</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionCard, { backgroundColor: colors.surfaceAlt }]} onPress={() => router.push('/(tabs)/recordings')}>
            <View style={[styles.actionIcon, { backgroundColor: '#EF444415' }]}>
              <Icon name={icons.recording} size={24} color="#EF4444" />
            </View>
            <Text style={[styles.actionLabel, { color: colors.text }]}>Recordings</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Calls */}
        {recentCalls.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Calls</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/calls')}>
                <Text style={[styles.seeAll, { color: colors.primary }]}>See All</Text>
              </TouchableOpacity>
            </View>
            {recentCalls.map(call => (
              <TouchableOpacity key={call.id} style={[styles.callItem, { backgroundColor: colors.surfaceAlt }]} onPress={() => router.push('/(tabs)/calls')}>
                <View style={[styles.callAvatar, { backgroundColor: colors.surface }]}>
                  <Icon name={call.direction === 'inbound' ? icons.call : icons.phoneFilled} size={20} color={call.status === 'completed' ? colors.success : colors.error} />
                </View>
                <View style={styles.callInfo}>
                  <Text style={[styles.callName, { color: colors.text }]}>{call.contacts?.name || call.from_number || call.to_number}</Text>
                  <Text style={[styles.callMeta, { color: colors.textMuted }]}>
                    {call.direction === 'inbound' ? 'Incoming' : 'Outgoing'} • {call.status}
                  </Text>
                </View>
                <Text style={[styles.callTime, { color: colors.textMuted }]}>
                  {new Date(call.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* Phone Numbers */}
        {phoneNumbers.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Numbers</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/settings/numbers')}>
                <Text style={[styles.seeAll, { color: colors.primary }]}>Manage</Text>
              </TouchableOpacity>
            </View>
            {phoneNumbers.map(num => (
              <TouchableOpacity key={num.id} style={[styles.numberItem, { backgroundColor: colors.surfaceAlt }]} onPress={() => router.push('/(tabs)/settings/numbers')}>
                <Icon name={icons.phonePortrait} size={20} color={colors.primary} />
                <View style={styles.numberInfo}>
                  <Text style={[styles.numberValue, { color: colors.text }]}>{num.formatted_number}</Text>
                  <Text style={[styles.numberLabel, { color: colors.textMuted }]}>{num.friendly_name || num.type}</Text>
                </View>
                <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
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
  loadingText: { fontSize: 18, marginTop: 12 },
  content: { padding: 16, paddingBottom: 24 },
  menuBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  greeting: { marginBottom: 24 },
  hello: { fontSize: 28, fontWeight: '700' },
  roleBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, marginTop: 8 },
  roleText: { fontSize: 13, fontWeight: '600', textTransform: 'capitalize' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  statCard: { flex: 1, alignItems: 'center', padding: 14, borderRadius: 14 },
  statNum: { fontSize: 24, fontWeight: '700' },
  statLabel: { fontSize: 11, marginTop: 2 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 14 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  seeAll: { fontSize: 14, fontWeight: '600' },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28 },
  actionCard: { width: '31%', alignItems: 'center', padding: 16, borderRadius: 14, gap: 8 },
  actionIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 13, fontWeight: '600' },
  callItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, marginBottom: 8, gap: 12 },
  callAvatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  callInfo: { flex: 1, gap: 2 },
  callName: { fontSize: 15, fontWeight: '600' },
  callMeta: { fontSize: 13 },
  callTime: { fontSize: 13 },
  numberItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, marginBottom: 8, gap: 12 },
  numberInfo: { flex: 1, gap: 2 },
  numberValue: { fontSize: 15, fontWeight: '600' },
  numberLabel: { fontSize: 13 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
});
