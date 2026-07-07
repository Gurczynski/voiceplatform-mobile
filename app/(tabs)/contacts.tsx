// Contacts Tab - Real contacts from Supabase
import { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, RefreshControl, StyleSheet, TouchableOpacity, Text, TextInput, Alert } from 'react-native';
import { useThemeContext } from '../../src/theme/ThemeProvider';
import { useAuthStore, useAppStore } from '../../src/stores';
import { supabase } from '../../src/lib/supabase';
import { ThemedView, ThemedText, ThemedHeader, ThemedInput, Icon, icons } from '../../src/components/ui';

export default function ContactsScreen() {
  const { theme } = useThemeContext();
  const { colors } = theme;
  const { currentOrganization } = useAuthStore();
  const { contacts, loadContacts, isLoadingContacts } = useAppStore();
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newCompany, setNewCompany] = useState('');

  useEffect(() => {
    if (currentOrganization?.id) loadContacts(currentOrganization.id);
  }, [currentOrganization?.id]);

  const onRefresh = useCallback(async () => {
    if (!currentOrganization?.id) return;
    setRefreshing(true);
    await loadContacts(currentOrganization.id);
    setRefreshing(false);
  }, [currentOrganization?.id]);

  const addContact = async () => {
    if (!newName.trim() || !newPhone.trim()) {
      Alert.alert('Error', 'Name and phone number required');
      return;
    }
    const { error } = await supabase.from('contacts').insert({
      organization_id: currentOrganization!.id,
      name: newName.trim(),
      phone_number: newPhone.trim(),
      email: newEmail.trim() || null,
      company: newCompany.trim() || null,
    });
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setNewName(''); setNewPhone(''); setNewEmail(''); setNewCompany(''); setShowAdd(false);
      loadContacts(currentOrganization!.id);
    }
  };

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
          <TouchableOpacity onPress={() => setShowAdd(!showAdd)} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
            <Icon name={icons.personAdd} size={20} color="#FFF" />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {showAdd && (
          <View style={[styles.addCard, { backgroundColor: colors.surfaceAlt }]}>
            <Text style={[styles.addTitle, { color: colors.text }]}>Add Contact</Text>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Name *</Text>
            <TextInput style={[styles.input, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]} placeholder="Contact name" placeholderTextColor={colors.textMuted} value={newName} onChangeText={setNewName} />
            <Text style={[styles.label, { color: colors.textSecondary }]}>Phone *</Text>
            <TextInput style={[styles.input, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]} placeholder="+1 555 123 4567" placeholderTextColor={colors.textMuted} value={newPhone} onChangeText={setNewPhone} keyboardType="phone-pad" />
            <Text style={[styles.label, { color: colors.textSecondary }]}>Email</Text>
            <TextInput style={[styles.input, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]} placeholder="email@example.com" placeholderTextColor={colors.textMuted} value={newEmail} onChangeText={setNewEmail} keyboardType="email-address" />
            <Text style={[styles.label, { color: colors.textSecondary }]}>Company</Text>
            <TextInput style={[styles.input, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]} placeholder="Company name" placeholderTextColor={colors.textMuted} value={newCompany} onChangeText={setNewCompany} />
            <View style={styles.addActions}>
              <TouchableOpacity onPress={() => setShowAdd(false)} style={[styles.cancelBtn, { borderColor: colors.border }]}><Text style={{ color: colors.text }}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={addContact} style={[styles.saveBtn, { backgroundColor: colors.primary }]}><Text style={{ color: '#FFF', fontWeight: '600' }}>Add Contact</Text></TouchableOpacity>
            </View>
          </View>
        )}

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
            <ThemedText variant="muted" align="center">{search ? 'Try a different search' : 'Tap + to add a contact'}</ThemedText>
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
                    <Text style={[styles.avatarText, { color: colors.primary }]}>
                      {(contact.name || '?')[0].toUpperCase()}
                    </Text>
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
  addBtn: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  addCard: { padding: 16, borderRadius: 16, marginBottom: 16, gap: 12 },
  addTitle: { fontSize: 18, fontWeight: '700' },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  addActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1 },
  saveBtn: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  letterGroup: { marginBottom: 16 },
  letterHeader: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginBottom: 8 },
  letterText: { fontSize: 14, fontWeight: '700' },
  contactItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, marginBottom: 6, gap: 12 },
  contactAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '600' },
  contactInfo: { flex: 1, gap: 2 },
  contactActions: { flexDirection: 'row', gap: 4 },
});
