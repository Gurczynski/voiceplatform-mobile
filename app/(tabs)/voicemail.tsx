// Voicemail Tab - Real voicemails from Supabase
import { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, RefreshControl, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useThemeContext } from '../../src/theme/ThemeProvider';
import { useAuthStore, useAppStore } from '../../src/stores';
import { supabase } from '../../src/lib/supabase';
import { ThemedView, ThemedText, ThemedCard, ThemedHeader, Icon, icons } from '../../src/components/ui';

export default function VoicemailScreen() {
  const { theme } = useThemeContext();
  const { colors, borderRadius } = theme;
  const { currentOrganization } = useAuthStore();
  const { voicemails, loadVoicemails } = useAppStore();
  const [refreshing, setRefreshing] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => {
    if (currentOrganization?.id) {
      loadVoicemails(currentOrganization.id);
    }
  }, [currentOrganization?.id]);

  const onRefresh = useCallback(async () => {
    if (!currentOrganization?.id) return;
    setRefreshing(true);
    await loadVoicemails(currentOrganization.id);
    setRefreshing(false);
  }, [currentOrganization?.id]);

  const markAsListened = async (id: string) => {
    await supabase.from('voicemail_messages').update({ status: 'listened' }).eq('id', id);
    if (currentOrganization?.id) loadVoicemails(currentOrganization.id);
  };

  const markAsResolved = async (id: string) => {
    await supabase.from('voicemail_messages').update({ status: 'resolved' }).eq('id', id);
    if (currentOrganization?.id) loadVoicemails(currentOrganization.id);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeAgo = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const newCount = voicemails.filter(v => v.status === 'new').length;

  return (
    <ThemedView variant="default" style={styles.container}>
      <ThemedHeader
        title="Voicemail"
        subtitle={`${voicemails.length} messages${newCount > 0 ? ` • ${newCount} new` : ''}`}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
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
            <ThemedCard
              key={vm.id}
              variant="outlined"
              padding="md"
              style={{
                ...styles.voicemailItem,
                ...(vm.status === 'new' ? { borderLeftColor: colors.primary, borderLeftWidth: 3 } : {}),
              }}
            >
              <View style={styles.voicemailHeader}>
                <View style={styles.voicemailLeft}>
                  <View style={[styles.avatar, { backgroundColor: colors.surfaceAlt }]}>
                    <Icon
                      name={vm.is_urgent ? icons.alert : icons.mic}
                      size={20}
                      color={vm.is_urgent ? colors.error : colors.primary}
                    />
                  </View>
                  <View style={styles.voicemailInfo}>
                    <ThemedText variant="body" weight="600">
                      {vm.contacts?.name || vm.from_number}
                    </ThemedText>
                    <ThemedText variant="caption">
                      {getTimeAgo(vm.created_at)} • {formatDuration(vm.duration_seconds)}
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.voicemailActions}>
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
              </View>

              {vm.ai_summary && (
                <View style={[styles.aiSummary, { backgroundColor: colors.surfaceAlt }]}>
                  <Icon name={icons.info} size={14} color={colors.primary} />
                  <ThemedText variant="caption" style={{ flex: 1 }}>{vm.ai_summary}</ThemedText>
                </View>
              )}

              {vm.transcription && (
                <ThemedText variant="body" style={styles.transcription} numberOfLines={3}>
                  {vm.transcription}
                </ThemedText>
              )}

              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.surfaceAlt }]}
                  onPress={() => {
                    setPlayingId(playingId === vm.id ? null : vm.id);
                    if (vm.status === 'new') markAsListened(vm.id);
                  }}
                >
                  <Icon name={playingId === vm.id ? icons.pause : icons.play} size={18} color={colors.primary} />
                  <ThemedText variant="caption" style={{ color: colors.primary }}>
                    {playingId === vm.id ? 'Pause' : 'Play'}
                  </ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.surfaceAlt }]}
                  onPress={() => markAsResolved(vm.id)}
                >
                  <Icon name={icons.checkCircle} size={18} color={colors.success} />
                  <ThemedText variant="caption" style={{ color: colors.success }}>Resolve</ThemedText>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.surfaceAlt }]}>
                  <Icon name={icons.call} size={18} color={colors.icon} />
                  <ThemedText variant="caption">Call Back</ThemedText>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.surfaceAlt }]}>
                  <Icon name={icons.chat} size={18} color={colors.icon} />
                  <ThemedText variant="caption">Text</ThemedText>
                </TouchableOpacity>
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
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  voicemailItem: { marginBottom: 12 },
  voicemailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  voicemailLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  voicemailInfo: { gap: 2 },
  voicemailActions: { flexDirection: 'row', gap: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  aiSummary: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, padding: 10, borderRadius: 8, marginBottom: 8 },
  transcription: { marginBottom: 12 },
  actions: { flexDirection: 'row', gap: 8 },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10, borderRadius: 8 },
});
