// Payment Collection - Send payment requests via SMS
import { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useThemeContext } from '../../src/theme/ThemeProvider';
import { useAuthStore } from '../../src/stores';
import { supabase } from '../../src/lib/supabase';
import { ThemedView, ThemedText, ThemedHeader, Icon, icons } from '../../src/components/ui';

export default function PaymentsScreen() {
  const { theme } = useThemeContext();
  const { colors } = theme;
  const { currentOrganization } = useAuthStore();
  const [payments, setPayments] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedContact, setSelectedContact] = useState('');

  useEffect(() => { if (currentOrganization?.id) { loadPayments(); loadContacts(); } }, [currentOrganization?.id]);

  const loadPayments = async () => {
    const { data } = await supabase.from('payment_requests').select('*, contacts(*)').eq('organization_id', currentOrganization!.id).order('created_at', { ascending: false });
    setPayments(data || []);
  };

  const loadContacts = async () => {
    const { data } = await supabase.from('contacts').select('id, name, phone_number').eq('organization_id', currentOrganization!.id).order('name');
    setContacts(data || []);
  };

  const createPayment = async () => {
    if (!amount || !selectedContact) { Alert.alert('Error', 'Amount and contact required'); return; }
    const amountCents = Math.round(parseFloat(amount) * 100);
    await supabase.from('payment_requests').insert({
      organization_id: currentOrganization!.id, contact_id: selectedContact, amount_cents: amountCents,
      description: description.trim(), status: 'pending',
    });
    setAmount(''); setDescription(''); setSelectedContact(''); setShowCreate(false);
    loadPayments();
  };

  const sendPayment = async (id: string) => {
    await supabase.from('payment_requests').update({ status: 'sent', sent_via: 'sms', sent_at: new Date().toISOString() }).eq('id', id);
    Alert.alert('Sent', 'Payment request sent via SMS');
    loadPayments();
  };

  const getStatusColor = (status: string) => {
    if (status === 'paid') return colors.success;
    if (status === 'sent' || status === 'viewed') return colors.primary;
    if (status === 'expired' || status === 'canceled') return colors.textMuted;
    return colors.warning;
  };

  const totalPending = payments.filter(p => p.status === 'pending' || p.status === 'sent').reduce((sum, p) => sum + p.amount_cents, 0);
  const totalPaid = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount_cents, 0);

  return (
    <ThemedView variant="default" style={styles.container}>
      <ThemedHeader title="Payments" showBack rightAction={
        <TouchableOpacity onPress={() => setShowCreate(!showCreate)} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
          <Icon name={icons.add} size={18} color="#FFF" />
        </TouchableOpacity>
      } />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.statsRow, { backgroundColor: colors.surfaceAlt }]}>
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: colors.warning }]}>${(totalPending / 100).toFixed(0)}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Pending</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: colors.success }]}>${(totalPaid / 100).toFixed(0)}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Collected</Text>
          </View>
        </View>

        {showCreate && (
          <View style={[styles.createCard, { backgroundColor: colors.surfaceAlt }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>New Payment Request</Text>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Amount ($)</Text>
            <TextInput style={[styles.input, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]} placeholder="100.00" placeholderTextColor={colors.textMuted} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
            <Text style={[styles.label, { color: colors.textSecondary }]}>Description</Text>
            <TextInput style={[styles.input, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]} placeholder="What's this payment for?" placeholderTextColor={colors.textMuted} value={description} onChangeText={setDescription} />
            <Text style={[styles.label, { color: colors.textSecondary }]}>Customer</Text>
            <View style={styles.contactList}>
              {contacts.map(c => (
                <TouchableOpacity key={c.id} style={[styles.contactBtn, { backgroundColor: selectedContact === c.id ? colors.primary : colors.surface, borderColor: selectedContact === c.id ? colors.primary : colors.border }]} onPress={() => setSelectedContact(c.id)}>
                  <Text style={{ color: selectedContact === c.id ? '#FFF' : colors.text }}>{c.name || c.phone_number}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.createActions}>
              <TouchableOpacity onPress={() => setShowCreate(false)} style={[styles.cancelBtn, { borderColor: colors.border }]}><Text style={{ color: colors.text }}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={createPayment} style={[styles.saveBtn, { backgroundColor: colors.primary }]}><Text style={{ color: '#FFF', fontWeight: '600' }}>Create</Text></TouchableOpacity>
            </View>
          </View>
        )}

        {payments.length === 0 && !showCreate ? (
          <View style={styles.empty}>
            <Icon name={icons.star} size={48} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No payment requests</Text>
            <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>Send payment requests to collect from customers</Text>
          </View>
        ) : payments.map(p => (
          <View key={p.id} style={[styles.card, { backgroundColor: colors.surfaceAlt }]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardInfo}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>${(p.amount_cents / 100).toFixed(2)}</Text>
                <Text style={[styles.cardMeta, { color: colors.textMuted }]}>{p.contacts?.name || 'Unknown'}</Text>
                {p.description && <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>{p.description}</Text>}
              </View>
              <View style={[styles.badge, { backgroundColor: getStatusColor(p.status) + '15' }]}>
                <Text style={[styles.badgeText, { color: getStatusColor(p.status) }]}>{p.status}</Text>
              </View>
            </View>
            {p.status === 'pending' && (
              <TouchableOpacity onPress={() => sendPayment(p.id)} style={[styles.sendBtn, { backgroundColor: colors.primary }]}>
                <Text style={{ color: '#FFF', fontWeight: '600' }}>Send via SMS</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

import { Text } from 'react-native';
const styles = StyleSheet.create({
  container: { flex: 1 }, content: { padding: 16, paddingBottom: 24 },
  addBtn: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  statsRow: { flexDirection: 'row', padding: 16, borderRadius: 16, marginBottom: 16 },
  stat: { flex: 1, alignItems: 'center', gap: 4 },
  statNum: { fontSize: 24, fontWeight: '700' },
  statLabel: { fontSize: 12 },
  createCard: { padding: 16, borderRadius: 16, marginBottom: 16, gap: 12 },
  cardTitle: { fontSize: 18, fontWeight: '700' },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  contactList: { gap: 8, marginBottom: 8 },
  contactBtn: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1 },
  createActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1 },
  saveBtn: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600' },
  emptyDesc: { fontSize: 14, textAlign: 'center' },
  card: { padding: 16, borderRadius: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  cardInfo: { flex: 1, gap: 2 },
  cardMeta: { fontSize: 13 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  sendBtn: { padding: 10, borderRadius: 8, alignItems: 'center' },
});
