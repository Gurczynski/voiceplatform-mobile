// Business Hours - Professional Quality
import { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Switch, Alert, Text } from 'react-native';
import { useThemeContext } from '../../src/theme/ThemeProvider';
import { useAuthStore } from '../../src/stores';
import { supabase } from '../../src/lib/supabase';
import { ThemedView, ThemedText, ThemedHeader, Icon, icons } from '../../src/components/ui';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_LABELS = { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun' };
const TIMES = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00'];
const AFTER_HOURS = [
  { key: 'voicemail', label: 'Voicemail', icon: icons.mail, desc: 'Send callers to voicemail' },
  { key: 'forward', label: 'Forward', icon: icons.call, desc: 'Forward to another number' },
  { key: 'ai_receptionist', label: 'AI Agent', icon: icons.mic, desc: 'AI handles the call' },
  { key: 'hangup', label: 'Hang Up', icon: icons.close, desc: 'End the call' },
];

export default function BusinessHoursScreen() {
  const { theme } = useThemeContext();
  const { colors } = theme;
  const { currentOrganization } = useAuthStore();
  const [hours, setHours] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState<string | null>(null);

  useEffect(() => { if (currentOrganization?.id) loadHours(); }, [currentOrganization?.id]);

  const loadHours = async () => {
    const { data } = await supabase.from('business_hours').select('*').eq('organization_id', currentOrganization!.id).single();
    if (data) setHours(data);
    else setHours({
      name: 'Default', is_active: true, timezone: 'America/New_York', after_hours_action: 'voicemail',
      schedule: Object.fromEntries(DAYS.map(d => [d, { enabled: d !== 'saturday' && d !== 'sunday', start: '09:00', end: '17:00' }]))
    });
  };

  const toggleDay = (day: string) => setHours((p: any) => ({ ...p, schedule: { ...p.schedule, [day]: { ...p.schedule[day], enabled: !p.schedule[day].enabled } } }));

  const setTime = (day: string, field: 'start' | 'end', value: string) => {
    setHours((p: any) => ({ ...p, schedule: { ...p.schedule, [day]: { ...p.schedule[day], [field]: value } } }));
    setShowTimePicker(null);
  };

  const save = async () => {
    setSaving(true);
    if (hours.id) await supabase.from('business_hours').update({ schedule: hours.schedule, after_hours_action: hours.after_hours_action }).eq('id', hours.id);
    else await supabase.from('business_hours').insert({ organization_id: currentOrganization!.id, ...hours });
    setSaving(false);
    Alert.alert('Saved', 'Business hours updated');
  };

  if (!hours) return <ThemedView variant="default" style={styles.container}><ThemedHeader title="Business Hours" showBack /></ThemedView>;

  return (
    <ThemedView variant="default" style={styles.container}>
      <ThemedHeader title="Business Hours" showBack />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.infoCard, { backgroundColor: colors.surfaceAlt }]}>
          <Icon name={icons.clock} size={20} color={colors.primary} />
          <ThemedText variant="caption" style={{ flex: 1 }}>Set when your business is open. Calls outside these hours will be handled by your after-hours settings.</ThemedText>
        </View>

        {DAYS.map(day => (
          <View key={day} style={[styles.dayCard, { backgroundColor: colors.surfaceAlt }]}>
            <View style={styles.dayHeader}>
              <Switch value={hours.schedule[day].enabled} onValueChange={() => toggleDay(day)} trackColor={{ true: colors.primary }} />
              <Text style={[styles.dayLabel, { color: colors.text }]}>{DAY_LABELS[day as keyof typeof DAY_LABELS]}</Text>
            </View>
            {hours.schedule[day].enabled && (
              <View style={styles.timeRow}>
                <TouchableOpacity style={[styles.timeBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setShowTimePicker(showTimePicker === `${day}-start` ? null : `${day}-start`)}>
                  <Text style={{ color: colors.text, fontSize: 16 }}>{hours.schedule[day].start}</Text>
                </TouchableOpacity>
                <Text style={{ color: colors.textMuted }}>to</Text>
                <TouchableOpacity style={[styles.timeBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setShowTimePicker(showTimePicker === `${day}-end` ? null : `${day}-end`)}>
                  <Text style={{ color: colors.text, fontSize: 16 }}>{hours.schedule[day].end}</Text>
                </TouchableOpacity>
              </View>
            )}
            {showTimePicker?.startsWith(day) && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timePicker} contentContainerStyle={styles.timePickerContent}>
                {TIMES.map(t => (
                  <TouchableOpacity key={t} style={[styles.timeOption, { backgroundColor: (showTimePicker.endsWith('start') ? hours.schedule[day].start : hours.schedule[day].end) === t ? colors.primary : colors.surface }]} onPress={() => setTime(day, showTimePicker.endsWith('start') ? 'start' : 'end', t)}>
                    <Text style={{ color: (showTimePicker.endsWith('start') ? hours.schedule[day].start : hours.schedule[day].end) === t ? '#FFF' : colors.text }}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        ))}

        <Text style={[styles.sectionTitle, { color: colors.text }]}>After Hours Action</Text>
        {AFTER_HOURS.map(action => (
          <TouchableOpacity key={action.key} style={[styles.actionCard, { backgroundColor: hours.after_hours_action === action.key ? colors.primary + '15' : colors.surfaceAlt, borderColor: hours.after_hours_action === action.key ? colors.primary : 'transparent' }]} onPress={() => setHours((p: any) => ({ ...p, after_hours_action: action.key }))}>
            <View style={[styles.radio, { borderColor: hours.after_hours_action === action.key ? colors.primary : colors.border, backgroundColor: hours.after_hours_action === action.key ? colors.primary : 'transparent' }]}>
              {hours.after_hours_action === action.key && <View style={styles.radioInner} />}
            </View>
            <Icon name={action.icon} size={20} color={hours.after_hours_action === action.key ? colors.primary : colors.textMuted} />
            <View style={styles.actionInfo}>
              <Text style={{ color: colors.text, fontWeight: '600' }}>{action.label}</Text>
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>{action.desc}</Text>
            </View>
          </TouchableOpacity>
        ))}

        <TouchableOpacity onPress={save} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
          <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, content: { padding: 16, paddingBottom: 24 },
  infoCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, marginBottom: 16 },
  dayCard: { padding: 14, borderRadius: 12, marginBottom: 8 },
  dayHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dayLabel: { fontSize: 16, fontWeight: '600', width: 40 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12, marginLeft: 56 },
  timeBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  timePicker: { marginTop: 12, marginLeft: 56 },
  timePickerContent: { gap: 8 },
  timeOption: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginTop: 24, marginBottom: 12 },
  actionCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, marginBottom: 8, borderWidth: 1 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFF' },
  actionInfo: { flex: 1, gap: 2 },
  saveBtn: { padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 24 },
  saveBtnText: { color: '#FFF', fontWeight: '600', fontSize: 16 },
});
