// Messages Tab - Real conversations from Supabase
import { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, RefreshControl, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeContext } from '../../src/theme/ThemeProvider';
import { useAuthStore, useAppStore } from '../../src/stores';
import { ThemedView, ThemedText, ThemedCard, ThemedHeader, ThemedInput, Icon, icons } from '../../src/components/ui';

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
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return colors.success;
      case 'pending': return colors.warning;
      case 'resolved': return colors.textMuted;
      default: return colors.textMuted;
    }
  };

  return (
    <ThemedView variant="default" style={styles.container}>
      <ThemedHeader
        title="Messages"
        subtitle={`${conversations.length} conversations`}
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
            <ThemedText variant="muted" align="center">
              {search ? 'Try a different search' : 'Your conversations will appear here'}
            </ThemedText>
          </View>
        ) : (
          filteredConversations.map(conv => (
            <ThemedCard
              key={conv.id}
              variant="outlined"
              padding="md"
              style={styles.convItem}
              onPress={() => router.push(`/conversation/${conv.id}`)}
            >
              <View style={styles.convRow}>
                <View style={[styles.convAvatar, { backgroundColor: colors.surfaceAlt }]}>
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
  convItem: { marginBottom: 8 },
  convRow: { flexDirection: 'row', gap: 12 },
  convAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  unreadBadge: { position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  unreadText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  convInfo: { flex: 1, gap: 4 },
  convHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  convMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 8 },
});
