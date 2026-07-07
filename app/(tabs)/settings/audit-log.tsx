// Audit Log Viewer
import { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, RefreshControl, StyleSheet, TouchableOpacity } from 'react-native';
import { useThemeContext } from '../../../src/theme/ThemeProvider';
import { useAuthStore } from '../../../src/stores';
import { supabase } from '../../../src/lib/supabase';
import { ThemedView, ThemedText, ThemedHeader, Icon, icons } from '../../../src/components/ui';

export default function AuditLogScreen() {
  const { theme } = useThemeContext();
  const { colors } = theme;
  const { currentOrganization } = useAuthStore();
  const [logs, setLogs] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { if (currentOrganization?.id) loadLogs(); }, [currentOrganization?.id]);

  const loadLogs = async () => {
    const { data } = await supabase.from('audit_logs').select('*, user_profiles(*)').eq('organization_id', currentOrganization!.id).order('created_at', { ascending: false }).limit(100);
    setLogs(data || []);
  };

  const onRefresh = useCallback(async () => { setRefreshing(true); await loadLogs(); setRefreshing(false); }, []);

  const getTimeAgo = (d: string) => {
    const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const getActionColor = (action: string) => {
    if (action.includes('created') || action.includes('purchased')) return colors.success;
    if (action.includes('deleted') || action.includes('released')) return colors.error;
    if (action.includes('updated') || action.includes('assigned')) return colors.warning;
    return colors.primary;
  };

  return (
    <ThemedView variant="default" style={styles.container}>
      <ThemedHeader title="Audit Log" showBack />
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
        {logs.length === 0 ? (
          <View style={styles.empty}><Icon name={icons.time} size={48} color={colors.textMuted} /><ThemedText variant="subtitle">No audit logs</ThemedText></View>
        ) : logs.map(log => (
          <View key={log.id} style={[styles.logItem, { backgroundColor: colors.surfaceAlt }]}>
            <View style={[styles.dot, { backgroundColor: getActionColor(log.action) }]} />
            <View style={styles.logInfo}>
              <ThemedText variant="body">{log.action.replace('.', ' ').replace('_', ' ')}</ThemedText>
              <ThemedText variant="caption" style={{ color: colors.textMuted }}>
                {log.user_profiles?.full_name || 'System'} • {getTimeAgo(log.created_at)}
              </ThemedText>
              {log.resource_type && <ThemedText variant="caption">{log.resource_type}: {log.resource_id?.slice(0, 8)}</ThemedText>}
            </View>
          </View>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, content: { padding: 16, paddingBottom: 24 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  logItem: { flexDirection: 'row', padding: 14, borderRadius: 12, marginBottom: 8, gap: 12 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  logInfo: { flex: 1, gap: 2 },
});
