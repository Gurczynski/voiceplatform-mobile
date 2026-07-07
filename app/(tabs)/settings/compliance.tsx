// A2P Compliance Registration
import { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useThemeContext } from '../../../src/theme/ThemeProvider';
import { useAuthStore } from '../../../src/stores';
import { supabase } from '../../../src/lib/supabase';
import { ThemedView, ThemedText, ThemedHeader, Icon, icons } from '../../../src/components/ui';

export default function ComplianceScreen() {
  const { theme } = useThemeContext();
  const { colors } = theme;
  const { currentOrganization } = useAuthStore();
  const [registration, setRegistration] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    brand_name: '', brand_status: 'pending', campaign_name: '', campaign_status: 'pending',
    use_case: '', sample_messages: '', opt_in_method: '', privacy_policy_url: '', terms_url: '',
  });

  useEffect(() => { if (currentOrganization?.id) loadRegistration(); }, [currentOrganization?.id]);

  const loadRegistration = async () => {
    const { data } = await supabase.from('a2p_registrations').select('*').eq('organization_id', currentOrganization!.id).single();
    if (data) {
      setRegistration(data);
      setForm({
        brand_name: data.brand_name || '', brand_status: data.brand_status || 'pending',
        campaign_name: data.campaign_name || '', campaign_status: data.campaign_status || 'pending',
        use_case: data.use_case || '', sample_messages: data.sample_messages?.join('\n') || '',
        opt_in_method: data.opt_in_method || '', privacy_policy_url: data.privacy_policy_url || '', terms_url: data.terms_url || '',
      });
    }
  };

  const save = async () => {
    const data = { ...form, sample_messages: form.sample_messages.split('\n').filter(Boolean), organization_id: currentOrganization!.id };
    if (registration?.id) {
      await supabase.from('a2p_registrations').update(data).eq('id', registration.id);
    } else {
      await supabase.from('a2p_registrations').insert(data);
    }
    setEditing(false);
    Alert.alert('Saved', 'A2P registration updated');
    loadRegistration();
  };

  const getStatusColor = (status: string) => {
    if (status === 'approved' || status === 'active') return colors.success;
    if (status === 'rejected' || status === 'suspended') return colors.error;
    return colors.warning;
  };

  return (
    <ThemedView variant="default" style={styles.container}>
      <ThemedHeader title="A2P Compliance" showBack />
      <ScrollView contentContainerStyle={styles.content}>
        {registration && !editing ? (
          <>
            <View style={[styles.statusCard, { backgroundColor: colors.surfaceAlt }]}>
              <View style={styles.statusRow}>
                <ThemedText variant="label">Brand Status</ThemedText>
                <View style={[styles.badge, { backgroundColor: getStatusColor(registration.brand_status) + '20' }]}>
                  <Text style={{ color: getStatusColor(registration.brand_status), fontSize: 12 }}>{registration.brand_status}</Text>
                </View>
              </View>
              <View style={styles.statusRow}>
                <ThemedText variant="label">Campaign Status</ThemedText>
                <View style={[styles.badge, { backgroundColor: getStatusColor(registration.campaign_status) + '20' }]}>
                  <Text style={{ color: getStatusColor(registration.campaign_status), fontSize: 12 }}>{registration.campaign_status}</Text>
                </View>
              </View>
            </View>

            <View style={[styles.infoCard, { backgroundColor: colors.surfaceAlt }]}>
              <ThemedText variant="label">Brand Name</ThemedText>
              <ThemedText variant="body">{registration.brand_name}</ThemedText>
              {registration.campaign_name && <><ThemedText variant="label" style={{ marginTop: 12 }}>Campaign</ThemedText><ThemedText variant="body">{registration.campaign_name}</ThemedText></>}
              {registration.use_case && <><ThemedText variant="label" style={{ marginTop: 12 }}>Use Case</ThemedText><ThemedText variant="body">{registration.use_case}</ThemedText></>}
            </View>

            {registration.rejection_reason && (
              <View style={[styles.warningCard, { backgroundColor: colors.error + '10', borderColor: colors.error }]}>
                <Icon name={icons.alert} size={20} color={colors.error} />
                <ThemedText variant="body" style={{ color: colors.error, flex: 1 }}>{registration.rejection_reason}</ThemedText>
              </View>
            )}

            <TouchableOpacity onPress={() => setEditing(true)} style={[styles.editBtn, { backgroundColor: colors.surfaceAlt }]}>
              <Icon name={icons.edit} size={20} color={colors.primary} />
              <ThemedText variant="body" style={{ color: colors.primary }}>Edit Registration</ThemedText>
            </TouchableOpacity>
          </>
        ) : (
          <View style={[styles.formCard, { backgroundColor: colors.surfaceAlt }]}>
            <ThemedText variant="subtitle">A2P 10DLC Registration</ThemedText>
            {[
              { key: 'brand_name', label: 'Business Legal Name', placeholder: 'Your Company LLC' },
              { key: 'campaign_name', label: 'Campaign Name', placeholder: 'Transactional Messages' },
              { key: 'use_case', label: 'Use Case', placeholder: 'Customer support and notifications' },
              { key: 'sample_messages', label: 'Sample Messages (one per line)', placeholder: 'Your appointment is confirmed...\nYour order has shipped...' },
              { key: 'opt_in_method', label: 'Opt-in Method', placeholder: 'Website form, keyword opt-in' },
              { key: 'privacy_policy_url', label: 'Privacy Policy URL', placeholder: 'https://...' },
              { key: 'terms_url', label: 'Terms of Service URL', placeholder: 'https://...' },
            ].map(f => (
              <View key={f.key} style={styles.field}>
                <ThemedText variant="label">{f.label}</ThemedText>
                <TextInput
                  style={[styles.input, f.key === 'sample_messages' && styles.textArea, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
                  placeholder={f.placeholder} placeholderTextColor={colors.textMuted}
                  value={(form as any)[f.key]} onChangeText={(t: string) => setForm(p => ({ ...p, [f.key]: t }))}
                  multiline={f.key === 'sample_messages'}
                />
              </View>
            ))}
            <TouchableOpacity onPress={save} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
              <Text style={{ color: '#FFF', fontWeight: '600' }}>{registration ? 'Update' : 'Submit'} Registration</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

import { Text } from 'react-native';
const styles = StyleSheet.create({
  container: { flex: 1 }, content: { padding: 16, paddingBottom: 24 },
  statusCard: { padding: 16, borderRadius: 12, marginBottom: 16, gap: 12 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  infoCard: { padding: 16, borderRadius: 12, marginBottom: 16 },
  warningCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  editBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 12 },
  formCard: { padding: 16, borderRadius: 12, gap: 16 },
  field: { gap: 6 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  saveBtn: { padding: 16, borderRadius: 12, alignItems: 'center' },
});
