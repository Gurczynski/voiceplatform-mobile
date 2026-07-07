// Business Hours Configuration
import { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Switch, Alert } from 'react-native';
import { useThemeContext } from '../../../src/theme/ThemeProvider';
import { useAuthStore } from '../../../src/stores';
import { supabase } from '../../../src/lib/supabase';
import { ThemedView, ThemedText, ThemedHeader, Icon, icons } from '../../../src/components/ui';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default function BusinessHoursScreen() {
  const { theme } = useThemeContext();
  const { colors } = theme;
  const { currentOrganization } = useAuthStore();
  const [hours, setHours] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (currentOrganization?.id) loadHours(); }, [currentOrganization?.id]);

  const loadHours = async () => {
    const { data } = await supabase.from('business_hours').select('*').eq('organization_id', currentOrganization!.id).single();
    if (data) setHours(data);
    else setHours({
      name: 'Default', is_active: true, timezone: 'America/New_York', after_hours_action: 'voicemail',
      schedule: Object.fromEntries(DAYS.map(d => [d, { enabled: d !== 'saturday' && d !== 'sunday', start: '09:00', end: '17:00' }]))
    });
  };

  const toggleDay = (day: string) => {
    setHours((prev: any) => ({ ...prev, schedule: { ...prev.schedule, [day]: { ...prev.schedule[day], enabled: !prev.schedule[day].enabled } } }));
  };

  const setTime = (day: string, field: 'start' | 'end', value: string) => {
    setHours((prev: any) => ({ ...prev, schedule: { ...prev.schedule, [day]: { ...prev.schedule[day], [field]: value } } }));
  };

  const save = async () => {
    setSaving(true);
    const exists = hours.id;
    if (exists) {
      await supabase.from('business_hours').update({ schedule: hours.schedule, after_hours_action: hours.after_hours_action }).eq('id', hours.id);
    } else {
      await supabase.from('business_hours').insert({ organization_id: currentOrganization!.id, ...hours });
    }
    setSaving(false);
    Alert.alert('Saved', 'Business hours updated');
  };

  if (!hours) return <ThemedView variant="default" style={styles.container}><ThemedHeader title="Business Hours" showBack /></ThemedView>;

  return (
    <ThemedView variant="default" style={styles.container}>
      <ThemedHeader title="Business Hours" showBack />
      <ScrollView contentContainerStyle={styles.content}>
        {DAYS.map(day => (
          <View key={day} style={[styles.dayRow, { backgroundColor: colors.surfaceAlt }]}>
            <View style={styles.dayHeader}>
              <Switch value={hours.schedule[day].enabled} onValueChange={() => toggleDay(day)} trackColor={{ true: colors.primary }} />
              <ThemedText variant="body" weight="600" style={{ textTransform: 'capitalize', width: 90 }}>{day}</ThemedText>
            </View>
            {hours.schedule[day].enabled && (
              <View style={styles.timeRow}>
                <TouchableOpacity style={[styles.timeBtn, { backgroundColor: colors.surface }]}>
                  <ThemedText variant="body">{hours.schedule[day].start}</ThemedText>
                </TouchableOpacity>
                <ThemedText variant="muted">to</ThemedText>
                <TouchableOpacity style={[styles.timeBtn, { backgroundColor: colors.surface }]}>
                  <ThemedText variant="body">{hours.schedule[day].end}</ThemedText>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}

        <ThemedText variant="subtitle" style={{ marginTop: 24, marginBottom: 12 }}>After Hours</ThemedText>
        {['voicemail', 'forward', 'ai_receptionist', 'hangup'].map(action => (
          <TouchableOpacity key={action} style={[styles.actionRow, { backgroundColor: colors.surfaceAlt }]} onPress={() => setHours((p: any) => ({ ...p, after_hours_action: action }))}>
            <View style={[styles.radio, { borderColor: hours.after_hours_action === action ? colors.primary : colors.border, backgroundColor: hours.after_hours_action === action ? colors.primary : 'transparent' }]}>
              {hours.after_hours_action === action && <View style={styles.radioInner} />}
            </View>
            <ThemedText variant="body" style={{ textTransform: 'capitalize' }}>{action.replace('_', ' ')}</ThemedText>
          </TouchableOpacity>
        ))}

        <TouchableOpacity onPress={save} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
          <ThemedText variant="body" style={{ color: '#FFF' }}>{saving ? 'Saving...' : 'Save Changes'}</ThemedText>
        </TouchableOpacity>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, content: { padding: 16, paddingBottom: 24 },
  dayRow: { padding: 14, borderRadius: 12, marginBottom: 8 },
  dayHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12, marginLeft: 56 },
  timeBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, marginBottom: 8 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFF' },
  saveBtn: { padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 24 },
});
