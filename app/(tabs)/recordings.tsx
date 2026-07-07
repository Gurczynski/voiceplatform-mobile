// Recordings Management
import { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, RefreshControl, StyleSheet, TouchableOpacity } from 'react-native';
import { useThemeContext } from '../../src/theme/ThemeProvider';
import { useAuthStore } from '../../src/stores';
import { supabase } from '../../src/lib/supabase';
import { ThemedView, ThemedText, ThemedHeader, Icon, icons } from '../../src/components/ui';

export default function RecordingsScreen() {
  const { theme } = useThemeContext();
  const { colors } = theme;
  const { currentOrganization } = useAuthStore();
  const [recordings, setRecordings] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => { if (currentOrganization?.id) loadRecordings(); }, [currentOrganization?.id]);

  const loadRecordings = async () => {
    const { data } = await supabase.from('recordings').select('*, calls(*, contacts(*))').eq('organization_id', currentOrganization!.id).order('created_at', { ascending: false }).limit(50);
    setRecordings(data || []);
  };

  const onRefresh = useCallback(async () => { setRefreshing(true); await loadRecordings(); setRefreshing(false); }, []);

  const formatDuration = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const getTimeAgo = (d: string) => {
    const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <ThemedView variant="default" style={styles.container}>
      <ThemedHeader title="Recordings" showBack />
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
        {recordings.length === 0 ? (
          <View style={styles.empty}><Icon name={icons.recording} size={48} color={colors.textMuted} /><ThemedText variant="subtitle">No recordings</ThemedText></View>
        ) : recordings.map(rec => (
          <View key={rec.id} style={[styles.card, { backgroundColor: colors.surfaceAlt }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.avatar, { backgroundColor: colors.surface }]}>
                <Icon name={icons.recording} size={20} color={colors.primary} />
              </View>
              <View style={styles.info}>
                <ThemedText variant="body" weight="600">{rec.calls?.contacts?.name || rec.calls?.from_number || 'Unknown'}</ThemedText>
                <ThemedText variant="caption">{getTimeAgo(rec.created_at)} • {formatDuration(rec.duration_seconds)}</ThemedText>
              </View>
              <View style={[styles.badge, { backgroundColor: rec.status === 'completed' ? colors.success + '20' : colors.warning + '20' }]}>
                <Text style={{ color: rec.status === 'completed' ? colors.success : colors.warning, fontSize: 10 }}>{rec.status}</Text>
              </View>
            </View>
            {rec.ai_summary && (
              <View style={[styles.aiBox, { backgroundColor: colors.surface }]}>
                <Icon name={icons.info} size={14} color={colors.primary} />
                <ThemedText variant="caption" style={{ flex: 1 }}>{rec.ai_summary}</ThemedText>
              </View>
            )}
            {rec.transcription && <ThemedText variant="caption" numberOfLines={2}>{rec.transcription}</ThemedText>}
            <View style={styles.actions}>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.surface }]} onPress={() => setPlayingId(playingId === rec.id ? null : rec.id)}>
                <Icon name={playingId === rec.id ? icons.pause : icons.play} size={16} color={colors.primary} />
                <Text style={{ color: colors.primary, fontSize: 12 }}>{playingId === rec.id ? 'Pause' : 'Play'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.surface }]}>
                <Icon name={icons.download} size={16} color={colors.icon} />
                <Text style={{ color: colors.text, fontSize: 12 }}>Download</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.surface }]}>
                <Icon name={icons.share} size={16} color={colors.icon} />
                <Text style={{ color: colors.text, fontSize: 12 }}>Share</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

import { Text } from 'react-native';
const styles = StyleSheet.create({
  container: { flex: 1 }, content: { padding: 16, paddingBottom: 24 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  card: { padding: 14, borderRadius: 12, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, gap: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  aiBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 10, borderRadius: 8, marginBottom: 8 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10, borderRadius: 8 },
});
