import { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, RefreshControl, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useThemeContext } from '../../src/theme/ThemeProvider';
import { useAuthStore, useAppStore } from '../../src/stores';
import { ThemedView, ThemedText, ThemedHeader, ThemedInput, Icon, icons } from '../../src/components/ui';

export default function ContactsScreen() {
  const { theme } = useThemeContext();
  const { colors } = theme;
  const { currentOrganization } = useAuthStore();
  const { contacts, loadContacts, isLoadingContacts } = useAppStore();
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (currentOrganization?.id) loadContacts(currentOrganization.id);
  }, [currentOrganization?.id]);

  const onRefresh = useCallback(async () => {
    if (!currentOrganization?.id) return;
    setRefreshing(true);
    await loadContacts(currentOrganization.id);
    setRefreshing(false);
  }, [currentOrganization?.id]);

  const filteredContacts = contacts.filter(c => {
    if (!search) return true;
    return (
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone_number?.includes(search) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.company?.toLowerCase().includes(search.toLowerCase())
    );
  });

  const grouped = filteredContacts.reduce((acc, c) => {
    const letter = (c.name || c.phone_number || '#')[0].toUpperCase();
    if (!acc[letter]) acc[letter] = [];
    acc[letter].push(c);
    return acc;
  }, {} as Record<string, typeof filteredContacts>);

  return (
    <ThemedView variant="default" style={styles.container}>
      <ThemedHeader
        title="Contacts"
        subtitle={`${contacts.length} contacts`}
        rightAction={
          <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Icon name={icons.personAdd} size={24} color={colors.primary} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <ThemedInput
          placeholder="Search contacts..."
          value={search}
          onChangeText={setSearch}
          leftIcon={<Icon name={icons.search} size={18} color={colors.textMuted} />}
        />

        {isLoadingContacts ? (
          <View style={styles.emptyState}>
            <ThemedText variant="muted">Loading contacts...</ThemedText>
          </View>
        ) : Object.keys(grouped).length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name={icons.people} size={48} color={colors.textMuted} />
            <ThemedText variant="subtitle" align="center">No contacts found</ThemedText>
            <ThemedText variant="muted" align="center">{search ? 'Try a different search' : 'Add contacts to get started'}</ThemedText>
          </View>
        ) : (
          Object.keys(grouped).sort().map(letter => (
            <View key={letter} style={styles.letterGroup}>
              <View style={[styles.letterHeader, { backgroundColor: colors.surfaceAlt }]}>
                <Text style={[styles.letterText, { color: colors.primary }]}>{letter}</Text>
              </View>
              {grouped[letter].map(contact => (
                <TouchableOpacity key={contact.id} style={[styles.contactItem, { backgroundColor: colors.surfaceAlt }]}>
                  <View style={[styles.contactAvatar, { backgroundColor: colors.surface }]}>
                    <Icon name={icons.person} size={20} color={colors.primary} />
                  </View>
                  <View style={styles.contactInfo}>
                    <ThemedText variant="body" weight="600">{contact.name || 'Unknown'}</ThemedText>
                    <ThemedText variant="caption">{contact.phone_number}</ThemedText>
                    {contact.company && <ThemedText variant="caption" style={{ color: colors.textMuted }}>{contact.company}</ThemedText>}
                  </View>
                  <View style={styles.contactActions}>
                    {contact.is_vip && <Icon name={icons.starFilled} size={16} color={colors.warning} />}
                    {contact.is_blocked && <Icon name={icons.alert} size={16} color={colors.error} />}
                  </View>
                </TouchableOpacity>
              ))}
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
  letterGroup: { marginBottom: 16 },
  letterHeader: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginBottom: 8 },
  letterText: { fontSize: 14, fontWeight: '700' },
  contactItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, marginBottom: 6, gap: 12 },
  contactAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  contactInfo: { flex: 1, gap: 2 },
  contactActions: { flexDirection: 'row', gap: 4 },
});
