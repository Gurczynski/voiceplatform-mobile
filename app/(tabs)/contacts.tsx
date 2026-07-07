import { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, RefreshControl, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useThemeContext } from '../../src/theme/ThemeProvider';
import { useAuthStore } from '../../src/stores';
import { supabase } from '../../src/lib/supabase';
import { ThemedView, ThemedText, ThemedCard, ThemedHeader, ThemedInput, Icon, icons } from '../../src/components/ui';
import type { Contact } from '../../src/types';

export default function ContactsScreen() {
  const { theme } = useThemeContext();
  const { colors, spacing, fontSize, borderRadius } = theme;
  const { currentOrganization } = useAuthStore();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const loadContacts = useCallback(async () => {
    if (!currentOrganization) return;
    const { data } = await supabase
      .from('contacts')
      .select('*')
      .eq('organization_id', currentOrganization.id)
      .order('name', { ascending: true });
    setContacts(data || []);
    setLoading(false);
  }, [currentOrganization]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadContacts();
    setRefreshing(false);
  }, [loadContacts]);

  const filteredContacts = contacts.filter((contact) => {
    if (!search) return true;
    return (
      contact.name?.toLowerCase().includes(search.toLowerCase()) ||
      contact.phone_number.includes(search) ||
      contact.email?.toLowerCase().includes(search.toLowerCase()) ||
      contact.company?.toLowerCase().includes(search.toLowerCase())
    );
  });

  const groupedContacts = filteredContacts.reduce((acc, contact) => {
    const firstLetter = (contact.name || contact.phone_number || '#')[0].toUpperCase();
    if (!acc[firstLetter]) acc[firstLetter] = [];
    acc[firstLetter].push(contact);
    return acc;
  }, {} as Record<string, Contact[]>);

  const sortedLetters = Object.keys(groupedContacts).sort();

  return (
    <ThemedView variant="default" style={styles.container}>
      <ThemedHeader
        title="Contacts"
        subtitle={`${contacts.length} contacts`}
        rightAction={
          <TouchableOpacity>
            <Icon name={icons.personAdd} size={24} color={colors.primary} />
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
          placeholder="Search contacts..."
          value={search}
          onChangeText={setSearch}
          leftIcon={<Icon name={icons.search} size={18} color={colors.textMuted} />}
        />

        {loading ? (
          <View style={styles.emptyState}>
            <ThemedText variant="muted">Loading contacts...</ThemedText>
          </View>
        ) : sortedLetters.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name={icons.people} size={48} color={colors.textMuted} />
            <ThemedText variant="subtitle" align="center">No contacts found</ThemedText>
            <ThemedText variant="muted" align="center">
              {search ? 'Try a different search' : 'Add contacts to get started'}
            </ThemedText>
          </View>
        ) : (
          sortedLetters.map((letter) => (
            <View key={letter} style={styles.letterGroup}>
              <View style={[styles.letterHeader, { backgroundColor: colors.surfaceAlt }]}>
                <ThemedText variant="label" style={{ color: colors.primary }}>{letter}</ThemedText>
              </View>
              {groupedContacts[letter].map((contact) => (
                <ThemedCard key={contact.id} variant="outlined" padding="md" style={styles.contactItem}>
                  <View style={styles.contactRow}>
                    <View style={[styles.contactAvatar, { backgroundColor: colors.surfaceAlt }]}>
                      <Icon name={icons.person} size={20} color={colors.primary} />
                    </View>
                    <View style={styles.contactInfo}>
                      <ThemedText variant="body" weight="600">
                        {contact.name || 'Unknown'}
                      </ThemedText>
                      <ThemedText variant="caption">{contact.phone_number}</ThemedText>
                      {contact.company && (
                        <ThemedText variant="caption" style={{ color: colors.textMuted }}>{contact.company}</ThemedText>
                      )}
                    </View>
                    <View style={styles.contactActions}>
                      {contact.is_vip && <Icon name={icons.starFilled} size={16} color={colors.accent} />}
                      {contact.is_blocked && <Icon name={icons.alert} size={16} color={colors.error} />}
                    </View>
                  </View>
                </ThemedCard>
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
  scrollContent: { padding: 20, paddingBottom: 40 },
  letterGroup: { marginBottom: 16 },
  letterHeader: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginBottom: 8 },
  contactItem: { marginBottom: 6 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  contactAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  contactInfo: { flex: 1, gap: 2 },
  contactActions: { flexDirection: 'row', gap: 4 },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 8 },
});
