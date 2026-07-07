// A2P Compliance - Professional Quality
import { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, TextInput, Alert, Text } from 'react-native';
import { useThemeContext } from '../../src/theme/ThemeProvider';
import { useAuthStore } from '../../src/stores';
import { supabase } from '../../src/lib/supabase';
import { ThemedView, ThemedText, ThemedHeader, Icon, icons } from '../../src/components/ui';

export default function ComplianceScreen() {
  const { theme } = useThemeContext();
  const { colors } = theme;
  const { currentOrganization } = useAuthStore();
  const [registration, setRegistration] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    brand_name: '', campaign_name: '', use_case: '', sample_messages: '', opt_in_method: '', privacy_policy_url: '', terms_url: '',
  });

  useEffect(() => { if (currentOrganization?.id) loadRegistration(); }, [currentOrganization?.id]);

  const loadRegistration = async () => {
    const { data } = await supabase.from('a2p_registrations').select('*').eq('organization_id', currentOrganization!.id).single();
    if (data) {
      setRegistration(data);
      setForm({ brand_name: data.brand_name || '', campaign_name: data.campaign_name || '', use_case: data.use_case || '', sample_messages: data.sample_messages?.join('\n') || '', opt_in_method: data.opt_in_method || '', privacy_policy_url: data.privacy_policy_url || '', terms_url: data.terms_url || '' });
    }
  };

  const save = async () => {
    if (!form.brand_name.trim()) { Alert.alert('Error', 'Business name required'); return; }
    const data = { ...form, sample_messages: form.sample_messages.split('\n').filter(Boolean), organization_id: currentOrganization!.id };
    if (registration?.id) await supabase.from('a2p_registrations').update(data).eq('id', registration.id);
    else await supabase.from('a2p_registrations').insert(data);
    setEditing(false); Alert.alert('Saved', 'Registration updated'); loadRegistration();
  };

  const getStatusColor = (status: string) => {
    if (['approved', 'active'].includes(status)) return colors.success;
    if (['rejected', 'suspended'].includes(status)) return colors.error;
    return colors.warning;
  };

  const getStatusIcon = (status: string) => {
    if (['approved', 'active'].includes(status)) return icons.checkCircle;
    if (['rejected', 'suspended'].includes(status)) return icons.alert;
    return icons.clock;
  };

  return (
    <ThemedView variant="default" style={styles.container}>
      <ThemedHeader title="A2P Compliance" showBack />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.infoCard, { backgroundColor: colors.surfaceAlt }]}>
          <Icon name={icons.shield} size={20} color={colors.primary} />
          <ThemedText variant="caption" style={{ flex: 1 }}>A2P 10DLC registration is required for business SMS messaging in the US.</ThemedText>
        </View>

        {registration && !editing ? (
          <>
            <View style={[styles.statusCard, { backgroundColor: colors.surfaceAlt }]}>
              <View style={styles.statusRow}>
                <View style={styles.statusInfo}>
                  <Text style={[styles.statusLabel, { color: colors.textMuted }]}>Brand Status</Text>
                  <View style={styles.statusBadgeRow}>
                    <Icon name={getStatusIcon(registration.brand_status)} size={18} color={getStatusColor(registration.brand_status)} />
                    <Text style={[styles.statusValue, { color: getStatusColor(registration.brand_status) }]}>{registration.brand_status}</Text>
                  </View>
                </View>
                <View style={styles.statusInfo}>
                  <Text style={[styles.statusLabel, { color: colors.textMuted }]}>Campaign Status</Text>
                  <View style={styles.statusBadgeRow}>
                    <Icon name={getStatusIcon(registration.campaign_status)} size={18} color={getStatusColor(registration.campaign_status)} />
                    <Text style={[styles.statusValue, { color: getStatusColor(registration.campaign_status) }]}>{registration.campaign_status}</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={[styles.detailCard, { backgroundColor: colors.surfaceAlt }]}>
              <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Brand Name</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{registration.brand_name}</Text>
              {registration.campaign_name && <><Text style={[styles.detailLabel, { color: colors.textMuted }]}>Campaign</Text><Text style={[styles.detailValue, { color: colors.text }]}>{registration.campaign_name}</Text></>}
              {registration.use_case && <><Text style={[styles.detailLabel, { color: colors.textMuted }]}>Use Case</Text><Text style={[styles.detailValue, { color: colors.text }]}>{registration.use_case}</Text></>}
            </View>

            {registration.rejection_reason && (
              <View style={[styles.warningCard, { backgroundColor: colors.error + '10', borderColor: colors.error }]}>
                <Icon name={icons.alert} size={20} color={colors.error} />
                <Text style={[styles.warningText, { color: colors.error }]}>{registration.rejection_reason}</Text>
              </View>
            )}

            <TouchableOpacity onPress={() => setEditing(true)} style={[styles.editBtn, { backgroundColor: colors.surfaceAlt }]}>
              <Icon name={icons.edit} size={20} color={colors.primary} />
              <Text style={{ color: colors.primary, fontWeight: '600' }}>Edit Registration</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={[styles.formCard, { backgroundColor: colors.surfaceAlt }]}>
            <ThemedText variant="subtitle">Registration Form</ThemedText>
            {[
              { key: 'brand_name', label: 'Business Legal Name', placeholder: 'Your Company LLC', required: true },
              { key: 'campaign_name', label: 'Campaign Name', placeholder: 'Transactional Notifications' },
              { key: 'use_case', label: 'Use Case Description', placeholder: 'Customer support and order notifications' },
              { key: 'sample_messages', label: 'Sample Messages (one per line)', placeholder: 'Your order #1234 has shipped!\nYour appointment is confirmed for Tuesday at 2pm.' },
              { key: 'opt_in_method', label: 'Opt-in Method', placeholder: 'Website checkbox, keyword opt-in' },
              { key: 'privacy_policy_url', label: 'Privacy Policy URL', placeholder: 'https://yoursite.com/privacy' },
              { key: 'terms_url', label: 'Terms of Service URL', placeholder: 'https://yoursite.com/terms' },
            ].map(f => (
              <View key={f.key} style={styles.field}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                  {f.label}{f.required && <Text style={{ color: colors.error }}> *</Text>}
                </Text>
                <TextInput
                  style={[styles.input, f.key === 'sample_messages' && styles.textArea, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
                  placeholder={f.placeholder} placeholderTextColor={colors.textMuted}
                  value={(form as any)[f.key]} onChangeText={(t: string) => setForm(p => ({ ...p, [f.key]: t }))}
                  multiline={f.key === 'sample_messages'}
                />
              </View>
            ))}
            <View style={styles.formActions}>
              {registration && (
                <TouchableOpacity onPress={() => setEditing(false)} style={[styles.cancelBtn, { borderColor: colors.border }]}>
                  <Text style={{ color: colors.text }}>Cancel</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={save} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
                <Text style={styles.saveBtnText}>{registration ? 'Update' : 'Submit'} Registration</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, content: { padding: 16, paddingBottom: 24 },
  infoCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, marginBottom: 16 },
  statusCard: { padding: 16, borderRadius: 16, marginBottom: 16 },
  statusRow: { flexDirection: 'row', gap: 24 },
  statusInfo: { flex: 1, gap: 8 },
  statusLabel: { fontSize: 13 },
  statusBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusValue: { fontSize: 16, fontWeight: '600', textTransform: 'capitalize' },
  detailCard: { padding: 16, borderRadius: 16, marginBottom: 16 },
  detailLabel: { fontSize: 13, marginTop: 12 },
  detailValue: { fontSize: 16, marginTop: 4 },
  warningCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  warningText: { flex: 1, fontSize: 14 },
  editBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 12 },
  formCard: { padding: 16, borderRadius: 16, gap: 16 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 14, fontWeight: '500' },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  formActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center', borderWidth: 1 },
  saveBtn: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center' },
  saveBtnText: { color: '#FFF', fontWeight: '600', fontSize: 16 },
});
