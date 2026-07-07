// Scheduler - Schedule SMS and Voice calls
import { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useThemeContext } from '../../src/theme/ThemeProvider';
import { useAuthStore } from '../../src/stores';
import { supabase } from '../../src/lib/supabase';
import { ThemedView, ThemedText, ThemedHeader, Icon, icons } from '../../src/components/ui';

export default function SchedulerScreen() {
  const { theme } = useThemeContext();
  const { colors } = theme;
  const { currentOrganization } = useAuthStore();
  const [jobs, setJobs] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [contacts, setContacts] = useState<any[]>([]);
  const [phoneNumbers, setPhoneNumbers] = useState<any[]>([]);

  const [jobType, setJobType] = useState('sms');
  const [scheduleType, setScheduleType] = useState('once');
  const [recipientType, setRecipientType] = useState('contact');
  const [messageBody, setMessageBody] = useState('');
  const [selectedContact, setSelectedContact] = useState('');
  const [phoneNumberInput, setPhoneNumberInput] = useState('');
  const [contactGroup, setContactGroup] = useState('');
  const [selectedNumber, setSelectedNumber] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [jobName, setJobName] = useState('');

  useEffect(() => {
    if (currentOrganization?.id) {
      loadJobs();
      loadContacts();
      loadPhoneNumbers();
    }
  }, [currentOrganization?.id]);

  const loadJobs = async () => {
    const { data } = await supabase.from('scheduled_jobs').select('*').eq('organization_id', currentOrganization!.id).order('created_at', { ascending: false });
    setJobs(data || []);
  };

  const loadContacts = async () => {
    const { data } = await supabase.from('contacts').select('id, name, phone_number').eq('organization_id', currentOrganization!.id).order('name');
    setContacts(data || []);
  };

  const loadPhoneNumbers = async () => {
    const { data } = await supabase.from('phone_numbers').select('id, phone_number, friendly_name').eq('organization_id', currentOrganization!.id).in('status', ['purchased', 'assigned']);
    setPhoneNumbers(data || []);
  };

  const createJob = async () => {
    if (!jobName.trim() || !messageBody.trim()) { Alert.alert('Error', 'Please fill in job name and message'); return; }
    if (!selectedNumber) { Alert.alert('Error', 'Please select a phone number to send from'); return; }

    const scheduledAt = scheduledDate && scheduledTime ? new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString() : new Date().toISOString();

    await supabase.from('scheduled_jobs').insert({
      organization_id: currentOrganization!.id,
      type: jobType,
      message_body: messageBody,
      recipient_type: recipientType,
      contact_id: recipientType === 'contact' ? selectedContact : null,
      phone_number: recipientType === 'phone' ? phoneNumberInput : null,
      contact_group: recipientType === 'group' ? contactGroup : null,
      from_number_id: selectedNumber,
      schedule_type: scheduleType,
      scheduled_at: scheduledAt,
      next_run_at: scheduledAt,
      status: 'pending',
      max_retries: 3,
    });

    resetForm();
    setShowCreate(false);
    loadJobs();
  };

  const resetForm = () => {
    setJobName(''); setMessageBody(''); setSelectedContact(''); setPhoneNumberInput('');
    setContactGroup(''); setSelectedNumber(''); setScheduledDate(''); setScheduledTime('');
    setJobType('sms'); setScheduleType('once'); setRecipientType('contact');
  };

  const cancelJob = async (id: string) => {
    Alert.alert('Cancel Job', 'Cancel this scheduled job?', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes', style: 'destructive', onPress: async () => { await supabase.from('scheduled_jobs').update({ status: 'canceled' }).eq('id', id); loadJobs(); } },
    ]);
  };

  const deleteJob = async (id: string) => {
    Alert.alert('Delete', 'Delete this job?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await supabase.from('scheduled_jobs').delete().eq('id', id); loadJobs(); } },
    ]);
  };

  const getStatusColor = (status: string) => {
    if (status === 'completed') return colors.success;
    if (status === 'running') return colors.primary;
    if (status === 'failed') return colors.error;
    if (status === 'canceled') return colors.textMuted;
    return colors.warning;
  };

  const formatSchedule = (type: string) => {
    const map: Record<string, string> = { once: 'One Time', daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' };
    return map[type] || type;
  };

  return (
    <ThemedView variant="default" style={styles.container}>
      <ThemedHeader title="Scheduler" showBack rightAction={
        <TouchableOpacity onPress={() => setShowCreate(!showCreate)} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
          <Icon name={icons.add} size={18} color="#FFF" />
        </TouchableOpacity>
      } />

      <ScrollView contentContainerStyle={styles.content}>
        {showCreate && (
          <View style={[styles.createCard, { backgroundColor: colors.surfaceAlt }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>New Scheduled Job</Text>

            <Text style={[styles.label, { color: colors.textSecondary }]}>Job Name</Text>
            <TextInput style={[styles.input, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]} placeholder="e.g., Appointment Reminders" placeholderTextColor={colors.textMuted} value={jobName} onChangeText={setJobName} />

            <Text style={[styles.label, { color: colors.textSecondary }]}>Type</Text>
            <View style={styles.typeRow}>
              {[{ key: 'sms', label: 'SMS', icon: icons.chat }, { key: 'voice', label: 'Voice Call', icon: icons.call }].map(t => (
                <TouchableOpacity key={t.key} style={[styles.typeBtn, { backgroundColor: jobType === t.key ? colors.primary : colors.surface, borderColor: jobType === t.key ? colors.primary : colors.border }]} onPress={() => setJobType(t.key as any)}>
                  <Icon name={t.icon} size={16} color={jobType === t.key ? '#FFF' : colors.textMuted} />
                  <Text style={{ color: jobType === t.key ? '#FFF' : colors.text, fontWeight: '600' }}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { color: colors.textSecondary }]}>Schedule</Text>
            <View style={styles.typeRow}>
              {[{ key: 'once', label: 'Once' }, { key: 'daily', label: 'Daily' }, { key: 'weekly', label: 'Weekly' }, { key: 'monthly', label: 'Monthly' }].map(s => (
                <TouchableOpacity key={s.key} style={[styles.typeBtn, { backgroundColor: scheduleType === s.key ? colors.primary : colors.surface, borderColor: scheduleType === s.key ? colors.primary : colors.border }]} onPress={() => setScheduleType(s.key as any)}>
                  <Text style={{ color: scheduleType === s.key ? '#FFF' : colors.text, fontSize: 12, fontWeight: '600' }}>{s.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {scheduleType === 'once' && (
              <View style={styles.dateRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Date</Text>
                  <TextInput style={[styles.input, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textMuted} value={scheduledDate} onChangeText={setScheduledDate} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Time</Text>
                  <TextInput style={[styles.input, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]} placeholder="HH:MM" placeholderTextColor={colors.textMuted} value={scheduledTime} onChangeText={setScheduledTime} />
                </View>
              </View>
            )}

            <Text style={[styles.label, { color: colors.textSecondary }]}>Send From</Text>
            <View style={styles.numberRow}>
              {phoneNumbers.map(n => (
                <TouchableOpacity key={n.id} style={[styles.numberBtn, { backgroundColor: selectedNumber === n.id ? colors.primary : colors.surface, borderColor: selectedNumber === n.id ? colors.primary : colors.border }]} onPress={() => setSelectedNumber(n.id)}>
                  <Text style={{ color: selectedNumber === n.id ? '#FFF' : colors.text, fontSize: 12 }}>{n.friendly_name || n.phone_number}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { color: colors.textSecondary }]}>Send To</Text>
            <View style={styles.typeRow}>
              {[{ key: 'contact', label: 'Contact' }, { key: 'phone', label: 'Phone' }, { key: 'group', label: 'Group' }, { key: 'all_contacts', label: 'All' }].map(r => (
                <TouchableOpacity key={r.key} style={[styles.typeBtn, { backgroundColor: recipientType === r.key ? colors.primary : colors.surface, borderColor: recipientType === r.key ? colors.primary : colors.border }]} onPress={() => setRecipientType(r.key as any)}>
                  <Text style={{ color: recipientType === r.key ? '#FFF' : colors.text, fontSize: 12, fontWeight: '600' }}>{r.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {recipientType === 'contact' && (
              <View style={styles.contactList}>
                {contacts.map(c => (
                  <TouchableOpacity key={c.id} style={[styles.contactBtn, { backgroundColor: selectedContact === c.id ? colors.primary : colors.surface, borderColor: selectedContact === c.id ? colors.primary : colors.border }]} onPress={() => setSelectedContact(c.id)}>
                    <Text style={{ color: selectedContact === c.id ? '#FFF' : colors.text }}>{c.name || c.phone_number}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {recipientType === 'phone' && (
              <TextInput style={[styles.input, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]} placeholder="+1 555 123 4567" placeholderTextColor={colors.textMuted} value={phoneNumberInput} onChangeText={setPhoneNumberInput} keyboardType="phone-pad" />
            )}

            {recipientType === 'group' && (
              <TextInput style={[styles.input, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]} placeholder="Group tag (e.g., vip, leads)" placeholderTextColor={colors.textMuted} value={contactGroup} onChangeText={setContactGroup} />
            )}

            <Text style={[styles.label, { color: colors.textSecondary }]}>Message</Text>
            <TextInput style={[styles.input, styles.textArea, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]} placeholder={jobType === 'sms' ? 'Your message here... Use {{name}} for personalization' : 'Voice script here...'} placeholderTextColor={colors.textMuted} value={messageBody} onChangeText={setMessageBody} multiline numberOfLines={4} />

            <View style={styles.createActions}>
              <TouchableOpacity onPress={() => { setShowCreate(false); resetForm(); }} style={[styles.cancelBtn, { borderColor: colors.border }]}>
                <Text style={{ color: colors.text }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={createJob} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
                <Text style={{ color: '#FFF', fontWeight: '600' }}>Schedule</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {jobs.length === 0 && !showCreate ? (
          <View style={styles.empty}>
            <Icon name={icons.clock} size={48} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No scheduled jobs</Text>
            <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>Schedule SMS messages or voice calls to be sent automatically</Text>
          </View>
        ) : jobs.map(job => (
          <View key={job.id} style={[styles.jobCard, { backgroundColor: colors.surfaceAlt }]}>
            <View style={styles.jobHeader}>
              <View style={[styles.jobIcon, { backgroundColor: job.type === 'sms' ? '#3B82F615' : '#10B98115' }]}>
                <Icon name={job.type === 'sms' ? icons.chat : icons.call} size={20} color={job.type === 'sms' ? '#3B82F6' : '#10B981'} />
              </View>
              <View style={styles.jobInfo}>
                <Text style={[styles.jobName, { color: colors.text }]}>{job.template_name || 'Scheduled Job'}</Text>
                <Text style={[styles.jobMeta, { color: colors.textMuted }]}>{formatSchedule(job.schedule_type)} • {job.type.toUpperCase()}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(job.status) + '15' }]}>
                <Text style={[styles.statusText, { color: getStatusColor(job.status) }]}>{job.status}</Text>
              </View>
            </View>

            {job.message_body && <Text style={[styles.jobMessage, { color: colors.textSecondary }]} numberOfLines={2}>{job.message_body}</Text>}

            <View style={styles.jobStats}>
              <Text style={[styles.statText, { color: colors.textMuted }]}>Sent: {job.total_sent || 0}</Text>
              <Text style={[styles.statText, { color: colors.textMuted }]}>Failed: {job.total_failed || 0}</Text>
              {job.next_run_at && <Text style={[styles.statText, { color: colors.textMuted }]}>Next: {new Date(job.next_run_at).toLocaleDateString()}</Text>}
            </View>

            {job.status === 'pending' && (
              <View style={styles.jobActions}>
                <TouchableOpacity onPress={() => cancelJob(job.id)} style={styles.jobAction}>
                  <Icon name={icons.close} size={16} color={colors.error} />
                  <Text style={{ color: colors.error, fontSize: 12 }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}

            {(job.status === 'completed' || job.status === 'canceled' || job.status === 'failed') && (
              <View style={styles.jobActions}>
                <TouchableOpacity onPress={() => deleteJob(job.id)} style={styles.jobAction}>
                  <Icon name={icons.trash} size={16} color={colors.error} />
                  <Text style={{ color: colors.error, fontSize: 12 }}>Delete</Text>
                </TouchableOpacity>
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
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 24 },
  addBtn: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  createCard: { padding: 16, borderRadius: 16, marginBottom: 16, gap: 12 },
  cardTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  typeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  dateRow: { flexDirection: 'row', gap: 12 },
  numberRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  numberBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  contactList: { gap: 8, marginBottom: 8 },
  contactBtn: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1 },
  createActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1 },
  saveBtn: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600' },
  emptyDesc: { fontSize: 14, textAlign: 'center' },
  jobCard: { padding: 16, borderRadius: 16, marginBottom: 12 },
  jobHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  jobIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  jobInfo: { flex: 1, gap: 2 },
  jobName: { fontSize: 16, fontWeight: '600' },
  jobMeta: { fontSize: 13 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  jobMessage: { fontSize: 14, marginBottom: 8 },
  jobStats: { flexDirection: 'row', gap: 16, marginBottom: 8 },
  statText: { fontSize: 12 },
  jobActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16 },
  jobAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
