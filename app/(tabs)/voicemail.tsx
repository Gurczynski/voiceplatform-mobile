import { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, RefreshControl, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useThemeContext } from '../../src/theme/ThemeProvider';
import { useAuthStore, useAppStore } from '../../src/stores';
import { supabase } from '../../src/lib/supabase';
import { ThemedView, ThemedText, ThemedHeader, Icon, icons } from '../../src/components/ui';

export default function VoicemailScreen() {
  const { theme } = useThemeContext();
  const { colors } = theme;
  const { currentOrganization } = useAuthStore();
  const { voicemails, loadVoicemails } = useAppStore();
  const [refreshing, setRefreshing] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => {
    if (currentOrganization?.id) loadVoicemails(currentOrganization.id);
  }, [currentOrganization?.id]);

  const onRefresh = useCallback(async () => {
    if (!currentOrganization?.id) return;
    setRefreshing(true);
    await loadVoicemails(currentOrganization.id);
    setRefreshing(false);
  }, [currentOrganization?.id]);

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('voicemail_messages').update({ status }).eq('id', id);
    if (currentOrganization?.id) loadVoicemails(currentOrganization.id);
  };

  const formatDuration = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const getTimeAgo = (dateStr: string) => {
    const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const newCount = voicemails.filter(v => v.status === 'new').length;

  return (
    <ThemedView variant="default" style={styles.container}>
      <ThemedHeader title="Voicemail" subtitle={`${voicemails.length} messages${newCount > 0 ? ` • ${newCount} new` : ''}`} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {voicemails.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name={icons.mic} size={48} color={colors.textMuted} />
            <ThemedText variant="subtitle" align="center">No voicemails</ThemedText>
            <ThemedText variant="muted" align="center">Voicemail messages will appear here</ThemedText>
          </View>
        ) : (
          voicemails.map(vm => (
            <View
              key={vm.id}
              style={[
                styles.vmItem,
                { backgroundColor: colors.surfaceAlt },
                vm.status === 'new' && { borderLeftColor: colors.primary, borderLeftWidth: 3 },
              ]}
            >
              <View style={styles.vmHeader}>
                <View style={[styles.vmAvatar, { backgroundColor: colors.surface }]}>
                  <Icon name={vm.is_urgent ? icons.alert : icons.mic} size={20} color={vm.is_urgent ? colors.error : colors.primary} />
                </View>
                <View style={styles.vmInfo}>
                  <ThemedText variant="body" weight="600">{vm.contacts?.name || vm.from_number}</ThemedText>
                  <ThemedText variant="caption">{getTimeAgo(vm.created_at)} • {formatDuration(vm.duration_seconds)}</ThemedText>
                </View>
                {vm.status === 'new' && (
                  <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.badgeText}>NEW</Text>
                  </View>
                )}
                {vm.is_urgent && (
                  <View style={[styles.badge, { backgroundColor: colors.error }]}>
                    <Text style={styles.badgeText}>URGENT</Text>
                  </View>
                )}
              </View>

              {vm.ai_summary && (
                <View style={[styles.aiBox, { backgroundColor: colors.surface }]}>
                  <Icon name={icons.info} size={14} color={colors.primary} />
                  <ThemedText variant="caption" style={{ flex: 1 }}>{vm.ai_summary}</ThemedText>
                </View>
              )}

              {vm.transcription && (
                <ThemedText variant="body" numberOfLines={3} style={styles.transcription}>{vm.transcription}</ThemedText>
              )}

              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: colors.surface }]}
                  onPress={() => { setPlayingId(playingId === vm.id ? null : vm.id); if (vm.status === 'new') updateStatus(vm.id, 'listened'); }}
                >
                  <Icon name={playingId === vm.id ? icons.pause : icons.play} size={16} color={colors.primary} />
                  <Text style={[styles.actionText, { color: colors.primary }]}>{playingId === vm.id ? 'Pause' : 'Play'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.surface }]} onPress={() => updateStatus(vm.id, 'resolved')}>
                  <Icon name={icons.checkCircle} size={16} color={colors.success} />
                  <Text style={[styles.actionText, { color: colors.success }]}>Resolve</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.surface }]}>
                  <Icon name={icons.call} size={16} color={colors.icon} />
                  <Text style={[styles.actionText, { color: colors.text }]}>Call</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.surface }]}>
                  <Icon name={icons.chat} size={16} color={colors.icon} />
                  <Text style={[styles.actionText, { color: colors.text }]}>Text</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 24 },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  vmItem: { padding: 16, borderRadius: 12, marginBottom: 12 },
  vmHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  vmAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  vmInfo: { flex: 1, gap: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  aiBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 10, borderRadius: 8, marginBottom: 8 },
  transcription: { marginBottom: 12 },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10, borderRadius: 8 },
  actionText: { fontSize: 12, fontWeight: '600' },
});
