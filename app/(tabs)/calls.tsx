// Calls Tab - Real call history from Supabase
import { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, RefreshControl, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeContext } from '../../src/theme/ThemeProvider';
import { useAuthStore, useAppStore } from '../../src/stores';
import { ThemedView, ThemedText, ThemedCard, ThemedHeader, ThemedInput, Icon, icons } from '../../src/components/ui';

export default function CallsScreen() {
  const { theme } = useThemeContext();
  const { colors, borderRadius } = theme;
  const { currentOrganization } = useAuthStore();
  const { calls, loadCalls, isLoadingCalls } = useAppStore();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'missed' | 'incoming' | 'outgoing'>('all');

  useEffect(() => {
    if (currentOrganization?.id) {
      loadCalls(currentOrganization.id);
    }
  }, [currentOrganization?.id]);

  const onRefresh = useCallback(async () => {
    if (!currentOrganization?.id) return;
    setRefreshing(true);
    await loadCalls(currentOrganization.id);
    setRefreshing(false);
  }, [currentOrganization?.id]);

  const filteredCalls = calls.filter(call => {
    const matchesSearch = !search ||
      call.from_number?.includes(search) ||
      call.to_number?.includes(search) ||
      call.contacts?.name?.toLowerCase().includes(search.toLowerCase());

    const matchesFilter =
      filter === 'all' ||
      (filter === 'missed' && ['no_answer', 'busy', 'failed'].includes(call.status)) ||
      (filter === 'incoming' && call.direction === 'inbound') ||
      (filter === 'outgoing' && call.direction === 'outbound');

    return matchesSearch && matchesFilter;
  });

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds < 60) return `${seconds || 0}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return colors.success;
      case 'ringing':
      case 'in_progress': return colors.primary;
      case 'no_answer':
      case 'busy':
      case 'failed': return colors.error;
      default: return colors.textMuted;
    }
  };

  const filters = [
    { key: 'all', label: 'All' },
    { key: 'missed', label: 'Missed' },
    { key: 'incoming', label: 'Incoming' },
    { key: 'outgoing', label: 'Outgoing' },
  ] as const;

  return (
    <ThemedView variant="default" style={styles.container}>
      <ThemedHeader
        title="Calls"
        subtitle={`${calls.length} total calls`}
        rightAction={
          <TouchableOpacity onPress={() => router.push('/dialpad')}>
            <Icon name={icons.add} size={24} color={colors.primary} />
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
        <ThemedInput
          placeholder="Search calls..."
          value={search}
          onChangeText={setSearch}
          leftIcon={<Icon name={icons.search} size={18} color={colors.textMuted} />}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
          {filters.map(f => (
            <TouchableOpacity
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[styles.filterChip, { backgroundColor: filter === f.key ? colors.primary : colors.surfaceAlt, borderRadius: borderRadius.full }]}
            >
              <Text style={[styles.filterText, { color: filter === f.key ? '#FFFFFF' : colors.textSecondary }]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {isLoadingCalls ? (
          <View style={styles.emptyState}>
            <ThemedText variant="muted">Loading calls...</ThemedText>
          </View>
        ) : filteredCalls.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name={icons.call} size={48} color={colors.textMuted} />
            <ThemedText variant="subtitle" align="center">No calls found</ThemedText>
            <ThemedText variant="muted" align="center">
              {search ? 'Try a different search' : 'Your call history will appear here'}
            </ThemedText>
          </View>
        ) : (
          filteredCalls.map(call => (
            <ThemedCard key={call.id} variant="outlined" padding="md" style={styles.callItem}>
              <View style={styles.callRow}>
                <View style={[styles.callAvatar, { backgroundColor: colors.surfaceAlt }]}>
                  <Icon
                    name={call.direction === 'inbound' ? icons.call : icons.phoneFilled}
                    size={20}
                    color={getStatusColor(call.status)}
                  />
                </View>
                <View style={styles.callInfo}>
                  <ThemedText variant="body" weight="600">
                    {call.contacts?.name || (call.direction === 'inbound' ? call.from_number : call.to_number)}
                  </ThemedText>
                  <ThemedText variant="caption" style={{ color: getStatusColor(call.status) }}>
                    {call.direction === 'inbound' ? 'Incoming' : 'Outgoing'} • {call.status}
                    {call.duration_seconds > 0 && ` • ${formatDuration(call.duration_seconds)}`}
                  </ThemedText>
                  {call.ai_summary && (
                    <ThemedText variant="caption" numberOfLines={1} style={{ color: colors.textMuted }}>
                      {call.ai_summary}
                    </ThemedText>
                  )}
                </View>
                <View style={styles.callRight}>
                  <ThemedText variant="caption">
                    {new Date(call.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </ThemedText>
                  <ThemedText variant="caption" style={{ color: colors.textMuted }}>
                    {new Date(call.started_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </ThemedText>
                </View>
              </View>
            </ThemedCard>
          ))
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  filterRow: { marginVertical: 16 },
  filterContent: { gap: 8 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8 },
  filterText: { fontSize: 14, fontWeight: '600' },
  callItem: { marginBottom: 8 },
  callRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  callAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  callInfo: { flex: 1 },
  callRight: { alignItems: 'flex-end', gap: 2 },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 8 },
});
