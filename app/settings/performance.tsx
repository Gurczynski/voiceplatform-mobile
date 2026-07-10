// Performance Dashboard - Agent stats and metrics
import { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useThemeContext } from '../../src/theme/ThemeProvider';
import { useAuthStore } from '../../src/stores';
import { supabase } from '../../src/lib/supabase';
import { ThemedView, ThemedText, ThemedHeader, Icon, icons } from '../../src/components/ui';

export default function PerformanceScreen() {
  const { theme } = useThemeContext();
  const { colors } = theme;
  const { user, currentOrganization } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (currentOrganization?.id && user?.id) loadStats(); }, [currentOrganization?.id, user?.id, period]);

  const loadStats = async () => {
    setLoading(true);
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    const { data: calls } = await supabase
      .from('calls')
      .select('*')
      .eq('organization_id', currentOrganization!.id)
      .or(`initiated_by.eq.${user!.id},answered_by.eq.${user!.id}`)
      .gte('started_at', startDate.toISOString());

    const { data: messages } = await supabase
      .from('messages')
      .select('*')
      .eq('sender_id', user!.id)
      .gte('created_at', startDate.toISOString());

    const totalCalls = calls?.length || 0;
    const completedCalls = calls?.filter(c => c.status === 'completed').length || 0;
    const missedCalls = calls?.filter(c => ['no_answer', 'busy', 'failed'].includes(c.status)).length || 0;
    const totalDuration = calls?.reduce((sum, c) => sum + (c.duration_seconds || 0), 0) || 0;
    const avgDuration = totalCalls > 0 ? totalDuration / totalCalls : 0;
    const answerRate = totalCalls > 0 ? (completedCalls / totalCalls * 100) : 0;
    const totalMessages = messages?.length || 0;

    setStats({
      totalCalls,
      completedCalls,
      missedCalls,
      totalDuration,
      avgDuration,
      answerRate,
      totalMessages,
    });
    setLoading(false);
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatTotalDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  return (
    <ThemedView variant="default" style={styles.container}>
      <ThemedHeader title="Performance" showBack />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Period Selector */}
        <View style={[styles.periodRow, { backgroundColor: colors.surfaceAlt }]}>
          {(['today', 'week', 'month'] as const).map(p => (
            <TouchableOpacity key={p} style={[styles.periodBtn, { backgroundColor: period === p ? colors.primary : 'transparent' }]} onPress={() => setPeriod(p)}>
              <Text style={{ color: period === p ? '#FFF' : colors.text, fontWeight: '600' }}>{p.charAt(0).toUpperCase() + p.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={styles.loadingState}>
            <Text style={{ color: colors.textMuted }}>Loading stats...</Text>
          </View>
        ) : stats && (
          <>
            {/* Main Stats */}
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { backgroundColor: colors.surfaceAlt }]}>
                <Icon name={icons.call} size={24} color={colors.primary} />
                <Text style={[styles.statValue, { color: colors.text }]}>{stats.totalCalls}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Total Calls</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.surfaceAlt }]}>
                <Icon name={icons.checkCircle} size={24} color={colors.success} />
                <Text style={[styles.statValue, { color: colors.text }]}>{stats.completedCalls}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Completed</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.surfaceAlt }]}>
                <Icon name={icons.alert} size={24} color={colors.error} />
                <Text style={[styles.statValue, { color: colors.text }]}>{stats.missedCalls}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Missed</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.surfaceAlt }]}>
                <Icon name={icons.chat} size={24} color={colors.primary} />
                <Text style={[styles.statValue, { color: colors.text }]}>{stats.totalMessages}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Messages</Text>
              </View>
            </View>

            {/* Detailed Stats */}
            <View style={[styles.detailCard, { backgroundColor: colors.surfaceAlt }]}>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Answer Rate</Text>
                <Text style={[styles.detailValue, { color: stats.answerRate >= 80 ? colors.success : stats.answerRate >= 50 ? colors.warning : colors.error }]}>
                  {stats.answerRate.toFixed(0)}%
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Average Call Duration</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{formatDuration(Math.round(stats.avgDuration))}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Total Talk Time</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{formatTotalDuration(stats.totalDuration)}</Text>
              </View>
            </View>

            {/* Tips */}
            <View style={[styles.tipsCard, { backgroundColor: colors.surfaceAlt }]}>
              <Text style={[styles.tipsTitle, { color: colors.text }]}>Tips to Improve</Text>
              {stats.answerRate < 80 && (
                <View style={styles.tipRow}>
                  <Icon name={icons.info} size={16} color={colors.warning} />
                  <Text style={[styles.tipText, { color: colors.textSecondary }]}>Your answer rate is below 80%. Consider enabling call forwarding or AI receptionist.</Text>
                </View>
              )}
              {stats.missedCalls > 3 && (
                <View style={styles.tipRow}>
                  <Icon name={icons.info} size={16} color={colors.warning} />
                  <Text style={[styles.tipText, { color: colors.textSecondary }]}>You have {stats.missedCalls} missed calls. Check the callback queue to follow up.</Text>
                </View>
              )}
              {stats.avgDuration > 600 && (
                <View style={styles.tipRow}>
                  <Icon name={icons.info} size={16} color={colors.primary} />
                  <Text style={[styles.tipText, { color: colors.textSecondary }]}>Your average call is over 10 minutes. Consider using AI summaries to track action items.</Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 24 },
  periodRow: { flexDirection: 'row', borderRadius: 12, padding: 4, marginBottom: 20 },
  periodBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  loadingState: { paddingVertical: 60, alignItems: 'center' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  statCard: { width: '47%', alignItems: 'center', padding: 16, borderRadius: 16, gap: 4 },
  statValue: { fontSize: 28, fontWeight: '700' },
  statLabel: { fontSize: 12 },
  detailCard: { padding: 16, borderRadius: 16, marginBottom: 16 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  detailLabel: { fontSize: 14 },
  detailValue: { fontSize: 16, fontWeight: '600' },
  tipsCard: { padding: 16, borderRadius: 16 },
  tipsTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  tipText: { fontSize: 13, flex: 1, lineHeight: 18 },
});
