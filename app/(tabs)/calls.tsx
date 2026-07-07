import { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, RefreshControl, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeContext } from '../../src/theme/ThemeProvider';
import { useAuthStore, useAppStore } from '../../src/stores';
import { ThemedView, ThemedText, ThemedHeader, ThemedInput, Icon, icons } from '../../src/components/ui';

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
    if (currentOrganization?.id) loadCalls(currentOrganization.id);
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
    const matchesFilter = filter === 'all' ||
      (filter === 'missed' && ['no_answer', 'busy', 'failed'].includes(call.status)) ||
      (filter === 'incoming' && call.direction === 'inbound') ||
      (filter === 'outgoing' && call.direction === 'outbound');
    return matchesSearch && matchesFilter;
  });

  const formatDuration = (s: number) => {
    if (!s || s < 60) return `${s || 0}s`;
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  };

  const getStatusColor = (status: string) => {
    if (['completed'].includes(status)) return colors.success;
    if (['ringing', 'in_progress'].includes(status)) return colors.primary;
    if (['no_answer', 'busy', 'failed'].includes(status)) return colors.error;
    return colors.textMuted;
  };

  return (
    <ThemedView variant="default" style={styles.container}>
      <ThemedHeader
        title="Calls"
        subtitle={`${calls.length} calls`}
        rightAction={
          <TouchableOpacity onPress={() => router.push('/dialpad')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Icon name={icons.add} size={24} color={colors.primary} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <ThemedInput
          placeholder="Search calls..."
          value={search}
          onChangeText={setSearch}
          leftIcon={<Icon name={icons.search} size={18} color={colors.textMuted} />}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
          {(['all', 'missed', 'incoming', 'outgoing'] as const).map(f => (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
              style={[styles.filterChip, { backgroundColor: filter === f ? colors.primary : colors.surfaceAlt, borderRadius: borderRadius.full }]}
            >
              <Text style={[styles.filterText, { color: filter === f ? '#FFFFFF' : colors.textSecondary }]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
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
            <ThemedText variant="muted" align="center">{search ? 'Try a different search' : 'Your call history will appear here'}</ThemedText>
          </View>
        ) : (
          filteredCalls.map(call => (
            <TouchableOpacity key={call.id} style={[styles.callItem, { backgroundColor: colors.surfaceAlt }]}>
              <View style={[styles.callAvatar, { backgroundColor: colors.surface }]}>
                <Icon name={call.direction === 'inbound' ? icons.call : icons.phoneFilled} size={20} color={getStatusColor(call.status)} />
              </View>
              <View style={styles.callInfo}>
                <ThemedText variant="body" weight="600">
                  {call.contacts?.name || (call.direction === 'inbound' ? call.from_number : call.to_number)}
                </ThemedText>
                <ThemedText variant="caption" style={{ color: getStatusColor(call.status) }}>
                  {call.direction === 'inbound' ? 'Incoming' : 'Outgoing'} • {call.status}
                  {call.duration_seconds > 0 && ` • ${formatDuration(call.duration_seconds)}`}
                </ThemedText>
              </View>
              <View style={styles.callRight}>
                <ThemedText variant="caption">
                  {new Date(call.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </ThemedText>
                <ThemedText variant="caption" style={{ color: colors.textMuted }}>
                  {new Date(call.started_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </ThemedText>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 24 },
  filterRow: { marginVertical: 12 },
  filterContent: { gap: 8 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8 },
  filterText: { fontSize: 14, fontWeight: '600' },
  callItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, marginBottom: 8, gap: 12 },
  callAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  callInfo: { flex: 1, gap: 2 },
  callRight: { alignItems: 'flex-end', gap: 2 },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 8 },
});
