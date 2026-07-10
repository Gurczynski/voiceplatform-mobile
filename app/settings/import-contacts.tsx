// Contact Import - Import from phone contacts
import { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Text, Alert, Platform } from 'react-native';
import { useThemeContext } from '../../src/theme/ThemeProvider';
import { useAuthStore } from '../../src/stores';
import { supabase } from '../../src/lib/supabase';
import { ThemedView, ThemedText, ThemedHeader, Icon, icons } from '../../src/components/ui';

interface PhoneContact {
  id: string;
  name: string;
  phoneNumbers: string[];
  emails: string[];
  selected: boolean;
}

export default function ImportContactsScreen() {
  const { theme } = useThemeContext();
  const { colors } = theme;
  const { currentOrganization } = useAuthStore();
  const [contacts, setContacts] = useState<PhoneContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(0);

  const loadContacts = async () => {
    setLoading(true);
    // In a real app, use expo-contacts to load phone contacts
    // For now, show a placeholder
    setLoading(false);
    Alert.alert('Info', 'Contact import requires expo-contacts package. Install it to enable this feature.');
  };

  const toggleContact = (id: string) => {
    setContacts(prev => prev.map(c => c.id === id ? { ...c, selected: !c.selected } : c));
  };

  const selectAll = () => {
    setContacts(prev => prev.map(c => ({ ...c, selected: true })));
  };

  const deselectAll = () => {
    setContacts(prev => prev.map(c => ({ ...c, selected: false })));
  };

  const importSelected = async () => {
    const selected = contacts.filter(c => c.selected);
    if (selected.length === 0) {
      Alert.alert('Error', 'No contacts selected');
      return;
    }

    setImporting(true);
    let count = 0;

    for (const contact of selected) {
      for (const phone of contact.phoneNumbers) {
        try {
          await supabase.from('contacts').insert({
            organization_id: currentOrganization!.id,
            name: contact.name,
            phone_number: phone,
            email: contact.emails[0] || null,
          });
          count++;
        } catch (e) {
          // Skip duplicates
        }
      }
    }

    setImported(count);
    setImporting(false);
    Alert.alert('Success', `Imported ${count} contacts`);
  };

  return (
    <ThemedView variant="default" style={styles.container}>
      <ThemedHeader title="Import Contacts" showBack />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.infoCard, { backgroundColor: colors.surfaceAlt }]}>
          <Icon name={icons.people} size={24} color={colors.primary} />
          <View style={styles.infoContent}>
            <Text style={[styles.infoTitle, { color: colors.text }]}>Import from Phone</Text>
            <Text style={[styles.infoDesc, { color: colors.textMuted }]}>
              Import contacts from your phone's address book to OhTry Mobile.
            </Text>
          </View>
        </View>

        {contacts.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name={icons.personAdd} size={48} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No contacts loaded</Text>
            <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
              Tap the button below to load contacts from your phone
            </Text>
            <TouchableOpacity onPress={loadContacts} style={[styles.loadBtn, { backgroundColor: colors.primary }]}>
              <Text style={{ color: '#FFF', fontWeight: '600' }}>Load Contacts</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.selectActions}>
              <TouchableOpacity onPress={selectAll}>
                <Text style={{ color: colors.primary, fontWeight: '600' }}>Select All</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={deselectAll}>
                <Text style={{ color: colors.textMuted }}>Deselect All</Text>
              </TouchableOpacity>
              <Text style={{ color: colors.textMuted }}>
                {contacts.filter(c => c.selected).length} selected
              </Text>
            </View>

            {contacts.map(contact => (
              <TouchableOpacity
                key={contact.id}
                style={[styles.contactItem, { backgroundColor: colors.surfaceAlt }]}
                onPress={() => toggleContact(contact.id)}
              >
                <View style={[styles.checkbox, { borderColor: contact.selected ? colors.primary : colors.border, backgroundColor: contact.selected ? colors.primary : 'transparent' }]}>
                  {contact.selected && <Icon name={icons.check} size={14} color="#FFF" />}
                </View>
                <View style={styles.contactInfo}>
                  <Text style={[styles.contactName, { color: colors.text }]}>{contact.name}</Text>
                  <Text style={[styles.contactPhone, { color: colors.textMuted }]}>
                    {contact.phoneNumbers[0]}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              onPress={importSelected}
              disabled={importing || contacts.filter(c => c.selected).length === 0}
              style={[styles.importBtn, { backgroundColor: contacts.filter(c => c.selected).length > 0 ? colors.primary : colors.surfaceAlt }]}
            >
              <Text style={{ color: contacts.filter(c => c.selected).length > 0 ? '#FFF' : colors.textMuted, fontWeight: '600' }}>
                {importing ? 'Importing...' : `Import ${contacts.filter(c => c.selected).length} Contacts`}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {imported > 0 && (
          <View style={[styles.successCard, { backgroundColor: colors.success + '15' }]}>
            <Icon name={icons.checkCircle} size={20} color={colors.success} />
            <Text style={{ color: colors.success }}>{imported} contacts imported successfully</Text>
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 24 },
  infoCard: { flexDirection: 'row', padding: 16, borderRadius: 12, marginBottom: 16, gap: 12 },
  infoContent: { flex: 1 },
  infoTitle: { fontSize: 16, fontWeight: '600' },
  infoDesc: { fontSize: 14, marginTop: 4 },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600' },
  emptyDesc: { fontSize: 14, textAlign: 'center' },
  loadBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10, marginTop: 8 },
  selectActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  contactItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, marginBottom: 8, gap: 12 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  contactInfo: { flex: 1 },
  contactName: { fontSize: 16, fontWeight: '500' },
  contactPhone: { fontSize: 13, marginTop: 2 },
  importBtn: { padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  successCard: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderRadius: 12, marginTop: 16 },
});
