// Appointments - Booking and scheduling
import { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useThemeContext } from '../../src/theme/ThemeProvider';
import { useAuthStore } from '../../src/stores';
import { supabase } from '../../src/lib/supabase';
import { ThemedView, ThemedText, ThemedHeader, Icon, icons } from '../../src/components/ui';

export default function AppointmentsScreen() {
  const { theme } = useThemeContext();
  const { colors } = theme;
  const { currentOrganization } = useAuthStore();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

  const [title, setTitle] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (currentOrganization?.id) { loadAppointments(); loadServices(); }
  }, [currentOrganization?.id]);

  const loadAppointments = async () => {
    const { data } = await supabase.from('appointments').select('*, contacts(*), appointment_services(*)').eq('organization_id', currentOrganization!.id).order('start_time', { ascending: false });
    setAppointments(data || []);
  };

  const loadServices = async () => {
    const { data } = await supabase.from('appointment_services').select('*').eq('organization_id', currentOrganization!.id).eq('is_active', true);
    setServices(data || []);
  };

  const createAppointment = async () => {
    if (!title.trim() || !startDate || !startTime) { Alert.alert('Error', 'Title, date and time required'); return; }
    const start = new Date(`${startDate}T${startTime}:00`);
    const end = new Date(start.getTime() + 30 * 60000);
    await supabase.from('appointments').insert({
      organization_id: currentOrganization!.id, title: title.trim(), service_id: selectedService || null,
      start_time: start.toISOString(), end_time: end.toISOString(), notes: notes.trim(), status: 'scheduled',
    });
    setTitle(''); setStartDate(''); setStartTime(''); setNotes(''); setSelectedService(''); setShowCreate(false);
    loadAppointments();
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('appointments').update({ status }).eq('id', id);
    loadAppointments();
  };

  const now = new Date();
  const upcoming = appointments.filter(a => new Date(a.start_time) >= now && a.status !== 'canceled');
  const past = appointments.filter(a => new Date(a.start_time) < now || a.status === 'canceled');
  const display = activeTab === 'upcoming' ? upcoming : past;

  const getStatusColor = (status: string) => {
    if (status === 'completed') return colors.success;
    if (status === 'canceled' || status === 'no_show') return colors.error;
    if (status === 'confirmed') return colors.primary;
    return colors.warning;
  };

  return (
    <ThemedView variant="default" style={styles.container}>
      <ThemedHeader title="Appointments" showBack rightAction={
        <TouchableOpacity onPress={() => setShowCreate(!showCreate)} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
          <Icon name={icons.add} size={18} color="#FFF" />
        </TouchableOpacity>
      } />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.tabRow}>
          {['upcoming', 'past'].map(tab => (
            <TouchableOpacity key={tab} style={[styles.tab, { backgroundColor: activeTab === tab ? colors.primary : colors.surfaceAlt }]} onPress={() => setActiveTab(tab as any)}>
              <Text style={{ color: activeTab === tab ? '#FFF' : colors.text, fontWeight: '600' }}>{tab.charAt(0).toUpperCase() + tab.slice(1)} ({tab === 'upcoming' ? upcoming.length : past.length})</Text>
            </TouchableOpacity>
          ))}
        </View>

        {showCreate && (
          <View style={[styles.createCard, { backgroundColor: colors.surfaceAlt }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>New Appointment</Text>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Title</Text>
            <TextInput style={[styles.input, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]} placeholder="Appointment title" placeholderTextColor={colors.textMuted} value={title} onChangeText={setTitle} />
            {services.length > 0 && (
              <>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Service</Text>
                <View style={styles.typeRow}>
                  {services.map(s => (
                    <TouchableOpacity key={s.id} style={[styles.typeBtn, { backgroundColor: selectedService === s.id ? colors.primary : colors.surface, borderColor: selectedService === s.id ? colors.primary : colors.border }]} onPress={() => setSelectedService(s.id)}>
                      <Text style={{ color: selectedService === s.id ? '#FFF' : colors.text, fontSize: 12 }}>{s.name} ({s.duration_minutes}min)</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
            <View style={styles.dateRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Date</Text>
                <TextInput style={[styles.input, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textMuted} value={startDate} onChangeText={setStartDate} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Time</Text>
                <TextInput style={[styles.input, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]} placeholder="HH:MM" placeholderTextColor={colors.textMuted} value={startTime} onChangeText={setStartTime} />
              </View>
            </View>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Notes</Text>
            <TextInput style={[styles.input, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]} placeholder="Optional notes" placeholderTextColor={colors.textMuted} value={notes} onChangeText={setNotes} />
            <View style={styles.createActions}>
              <TouchableOpacity onPress={() => setShowCreate(false)} style={[styles.cancelBtn, { borderColor: colors.border }]}><Text style={{ color: colors.text }}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={createAppointment} style={[styles.saveBtn, { backgroundColor: colors.primary }]}><Text style={{ color: '#FFF', fontWeight: '600' }}>Schedule</Text></TouchableOpacity>
            </View>
          </View>
        )}

        {display.length === 0 ? (
          <View style={styles.empty}>
            <Icon name={icons.calendar} size={48} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No {activeTab} appointments</Text>
          </View>
        ) : display.map(apt => (
          <View key={apt.id} style={[styles.card, { backgroundColor: colors.surfaceAlt }]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardInfo}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>{apt.title}</Text>
                <Text style={[styles.cardMeta, { color: colors.textMuted }]}>
                  {new Date(apt.start_time).toLocaleDateString()} at {new Date(apt.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
                {apt.contacts && <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>{apt.contacts.name}</Text>}
                {apt.notes && <Text style={[styles.cardMeta, { color: colors.textMuted }]}>{apt.notes}</Text>}
              </View>
              <View style={[styles.badge, { backgroundColor: getStatusColor(apt.status) + '15' }]}>
                <Text style={[styles.badgeText, { color: getStatusColor(apt.status) }]}>{apt.status}</Text>
              </View>
            </View>
            {apt.status === 'scheduled' && (
              <View style={styles.actions}>
                <TouchableOpacity onPress={() => updateStatus(apt.id, 'confirmed')} style={[styles.actionBtn, { backgroundColor: colors.surface }]}><Text style={{ color: colors.primary, fontSize: 12 }}>Confirm</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => updateStatus(apt.id, 'completed')} style={[styles.actionBtn, { backgroundColor: colors.surface }]}><Text style={{ color: colors.success, fontSize: 12 }}>Complete</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => updateStatus(apt.id, 'canceled')} style={[styles.actionBtn, { backgroundColor: colors.surface }]}><Text style={{ color: colors.error, fontSize: 12 }}>Cancel</Text></TouchableOpacity>
              </View>
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
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tab: { flex: 1, padding: 10, borderRadius: 8, alignItems: 'center' },
  createCard: { padding: 16, borderRadius: 16, marginBottom: 16, gap: 12 },
  cardTitle: { fontSize: 18, fontWeight: '700' },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  typeBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  dateRow: { flexDirection: 'row', gap: 12 },
  createActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1 },
  saveBtn: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600' },
  card: { padding: 16, borderRadius: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  cardInfo: { flex: 1, gap: 4 },
  cardMeta: { fontSize: 13 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, padding: 8, borderRadius: 8, alignItems: 'center' },
});
