// Audit Log - Professional Quality
import { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, RefreshControl, StyleSheet, TouchableOpacity } from 'react-native';
import { useThemeContext } from '../../../src/theme/ThemeProvider';
import { useAuthStore } from '../../../src/stores';
import { supabase } from '../../../src/lib/supabase';
import { ThemedView, ThemedText, ThemedHeader, ThemedInput, Icon, icons } from '../../../src/components/ui';

const ACTION_COLORS: Record<string, string> = {
  created: '#10B981', purchased: '#10B981', assigned: '#3B82F6',
  updated: '#F59E0B', changed: '#F59E0B',
  deleted: '#EF4444', released: '#EF4444', removed: '#EF4444',
  signed_in: '#6366F1', signed_out: '#6366F1',
};

export default function AuditLogScreen() {
  const { theme } = useThemeContext();
  const { colors } = theme;
  const { currentOrganization } = useAuthStore();
  const [logs, setLogs] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => { if (currentOrganization?.id) loadLogs(); }, [currentOrganization?.id]);

  const loadLogs = async () => {
    const { data } = await supabase.from('audit_logs').select('*, user_profiles(*)').eq('organization_id', currentOrganization!.id).order('created_at', { ascending: false }).limit(100);
    setLogs(data || []);
  };

  const onRefresh = useCallback(async () => { setRefreshing(true); await loadLogs(); setRefreshing(false); }, []);

  const filteredLogs = logs.filter(log => {
    if (!search) return true;
    return log.action.includes(search.toLowerCase()) || log.user_profiles?.full_name?.toLowerCase().includes(search.toLowerCase());
  });

  const getTimeAgo = (d: string) => {
    const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const getActionColor = (action: string) => {
    for (const [key, color] of Object.entries(ACTION_COLORS)) {
      if (action.includes(key)) return color;
    }
    return colors.primary;
  };

  const getActionLabel = (action: string) => action.replace(/\./g, ' ').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <ThemedView variant="default" style={styles.container}>
      <ThemedHeader title="Audit Log" showBack />
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
        <ThemedInput placeholder="Search logs..." value={search} onChangeText={setSearch} leftIcon={<Icon name={icons.search} size={18} color={colors.textMuted} />} />

        {filteredLogs.length === 0 ? (
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceAlt }]}>
              <Icon name={icons.time} size={48} color={colors.textMuted} />
            </View>
            <ThemedText variant="subtitle">No audit logs</ThemedText>
            <ThemedText variant="muted">System events will appear here</ThemedText>
          </View>
        ) : filteredLogs.map(log => (
          <View key={log.id} style={[styles.card, { backgroundColor: colors.surfaceAlt }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.dot, { backgroundColor: getActionColor(log.action) }]} />
              <View style={styles.cardInfo}>
                <ThemedText variant="body" weight="600">{getActionLabel(log.action)}</ThemedText>
                <ThemedText variant="caption" style={{ color: colors.textMuted }}>
                  {log.user_profiles?.full_name || 'System'} • {getTimeAgo(log.created_at)}
                </ThemedText>
              </View>
            </View>
            {log.resource_type && (
              <View style={[styles.resourceTag, { backgroundColor: colors.surface }]}>
                <ThemedText variant="caption">{log.resource_type}{log.resource_id ? `: ${log.resource_id.slice(0, 8)}` : ''}</ThemedText>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, content: { padding: 16, paddingBottom: 24 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyIcon: { width: 80, height: 80, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  card: { padding: 14, borderRadius: 12, marginBottom: 8 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  cardInfo: { flex: 1, gap: 2 },
  resourceTag: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginTop: 8, marginLeft: 20 },
});
