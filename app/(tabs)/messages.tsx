import { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, RefreshControl, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeContext } from '../../src/theme/ThemeProvider';
import { useAuthStore, useAppStore } from '../../src/stores';
import { ThemedView, ThemedText, ThemedHeader, ThemedInput, Icon, icons } from '../../src/components/ui';

export default function MessagesScreen() {
  const { theme } = useThemeContext();
  const { colors, borderRadius } = theme;
  const { currentOrganization } = useAuthStore();
  const { conversations, loadConversations, isLoadingConversations, subscribeToMessages } = useAppStore();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (currentOrganization?.id) {
      loadConversations(currentOrganization.id);
      const unsub = subscribeToMessages(currentOrganization.id);
      return unsub;
    }
  }, [currentOrganization?.id]);

  const onRefresh = useCallback(async () => {
    if (!currentOrganization?.id) return;
    setRefreshing(true);
    await loadConversations(currentOrganization.id);
    setRefreshing(false);
  }, [currentOrganization?.id]);

  const filteredConversations = conversations.filter(conv => {
    if (!search) return true;
    return (
      conv.contacts?.name?.toLowerCase().includes(search.toLowerCase()) ||
      conv.contacts?.phone_number?.includes(search) ||
      conv.last_message_preview?.toLowerCase().includes(search.toLowerCase())
    );
  });

  const getTimeLabel = (dateStr?: string) => {
    if (!dateStr) return '';
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Now';
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getStatusColor = (status: string) => {
    if (status === 'open') return colors.success;
    if (status === 'pending') return colors.warning;
    return colors.textMuted;
  };

  return (
    <ThemedView variant="default" style={styles.container}>
      <ThemedHeader
        title="Messages"
        subtitle={`${conversations.length} conversations`}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <ThemedInput
          placeholder="Search messages..."
          value={search}
          onChangeText={setSearch}
          leftIcon={<Icon name={icons.search} size={18} color={colors.textMuted} />}
        />

        {isLoadingConversations ? (
          <View style={styles.emptyState}>
            <ThemedText variant="muted">Loading conversations...</ThemedText>
          </View>
        ) : filteredConversations.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name={icons.chat} size={48} color={colors.textMuted} />
            <ThemedText variant="subtitle" align="center">No conversations</ThemedText>
            <ThemedText variant="muted" align="center">{search ? 'Try a different search' : 'Your conversations will appear here'}</ThemedText>
          </View>
        ) : (
          filteredConversations.map(conv => (
            <TouchableOpacity
              key={conv.id}
              style={[styles.convItem, { backgroundColor: colors.surfaceAlt }]}
              onPress={() => router.push(`/conversation/${conv.id}`)}
            >
              <View style={[styles.convAvatar, { backgroundColor: colors.surface }]}>
                <Icon name={icons.person} size={22} color={colors.primary} />
                {conv.unread_count > 0 && (
                  <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.unreadText}>{conv.unread_count}</Text>
                  </View>
                )}
              </View>
              <View style={styles.convInfo}>
                <View style={styles.convHeader}>
                  <ThemedText variant="body" weight="600" style={{ flex: 1 }} numberOfLines={1}>
                    {conv.contacts?.name || conv.contacts?.phone_number || 'Unknown'}
                  </ThemedText>
                  <ThemedText variant="caption">{getTimeLabel(conv.last_message_at)}</ThemedText>
                </View>
                <ThemedText variant="muted" numberOfLines={1}>
                  {conv.last_message_preview || 'No messages yet'}
                </ThemedText>
                <View style={styles.convMeta}>
                  <View style={[styles.statusDot, { backgroundColor: getStatusColor(conv.status) }]} />
                  <ThemedText variant="caption" style={{ textTransform: 'capitalize' }}>{conv.status}</ThemedText>
                </View>
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
  convItem: { flexDirection: 'row', padding: 14, borderRadius: 12, marginBottom: 8, gap: 12 },
  convAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  unreadBadge: { position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  unreadText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  convInfo: { flex: 1, gap: 4 },
  convHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  convMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 8 },
});
