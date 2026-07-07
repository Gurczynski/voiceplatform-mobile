// Review Requests - Auto-send review requests after calls
import { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, TextInput, Switch, Alert } from 'react-native';
import { useThemeContext } from '../../src/theme/ThemeProvider';
import { useAuthStore } from '../../src/stores';
import { supabase } from '../../src/lib/supabase';
import { ThemedView, ThemedText, ThemedHeader, Icon, icons } from '../../src/components/ui';

export default function ReviewsScreen() {
  const { theme } = useThemeContext();
  const { colors } = theme;
  const { currentOrganization } = useAuthStore();
  const [reviews, setReviews] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [reviewUrl, setReviewUrl] = useState('');
  const [autoSend, setAutoSend] = useState(false);
  const [template, setTemplate] = useState('');

  useEffect(() => { if (currentOrganization?.id) { loadReviews(); loadSettings(); } }, [currentOrganization?.id]);

  const loadReviews = async () => {
    const { data } = await supabase.from('review_requests').select('*, contacts(*)').eq('organization_id', currentOrganization!.id).order('created_at', { ascending: false }).limit(50);
    setReviews(data || []);
  };

  const loadSettings = async () => {
    const { data } = await supabase.from('review_settings').select('*').eq('organization_id', currentOrganization!.id).single();
    if (data) { setSettings(data); setReviewUrl(data.review_url || ''); setAutoSend(data.auto_send); setTemplate(data.message_template || ''); }
  };

  const saveSettings = async () => {
    if (settings?.id) {
      await supabase.from('review_settings').update({ review_url: reviewUrl, auto_send: autoSend, message_template: template }).eq('id', settings.id);
    } else {
      await supabase.from('review_settings').insert({ organization_id: currentOrganization!.id, review_url: reviewUrl, auto_send: autoSend, message_template: template });
    }
    Alert.alert('Saved', 'Review settings updated');
    setShowSettings(false);
    loadSettings();
  };

  const sendReview = async (contactId: string) => {
    await supabase.from('review_requests').insert({
      organization_id: currentOrganization!.id, contact_id: contactId, type: 'google', status: 'sent', sent_at: new Date().toISOString(),
    });
    Alert.alert('Sent', 'Review request sent');
    loadReviews();
  };

  const getStatusColor = (status: string) => {
    if (status === 'reviewed') return colors.success;
    if (status === 'clicked') return colors.primary;
    return colors.warning;
  };

  return (
    <ThemedView variant="default" style={styles.container}>
      <ThemedHeader title="Review Requests" showBack rightAction={
        <TouchableOpacity onPress={() => setShowSettings(!showSettings)}>
          <Icon name={icons.settings} size={24} color={colors.primary} />
        </TouchableOpacity>
      } />
      <ScrollView contentContainerStyle={styles.content}>
        {showSettings && (
          <View style={[styles.settingsCard, { backgroundColor: colors.surfaceAlt }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Settings</Text>
            <View style={styles.switchRow}>
              <Text style={{ color: colors.text }}>Auto-send after positive calls</Text>
              <Switch value={autoSend} onValueChange={setAutoSend} trackColor={{ true: colors.primary }} />
            </View>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Review URL (Google, Yelp, etc.)</Text>
            <TextInput style={[styles.input, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]} placeholder="https://g.page/your-business/review" placeholderTextColor={colors.textMuted} value={reviewUrl} onChangeText={setReviewUrl} />
            <Text style={[styles.label, { color: colors.textSecondary }]}>Message Template</Text>
            <TextInput style={[styles.input, styles.textArea, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]} placeholder="Hi {{name}}, thank you for calling! We'd love a review: {{url}}" placeholderTextColor={colors.textMuted} value={template} onChangeText={setTemplate} multiline numberOfLines={3} />
            <TouchableOpacity onPress={saveSettings} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
              <Text style={{ color: '#FFF', fontWeight: '600' }}>Save Settings</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={[styles.statsRow, { backgroundColor: colors.surfaceAlt }]}>
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: colors.primary }]}>{reviews.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Sent</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: colors.success }]}>{reviews.filter(r => r.status === 'reviewed').length}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Reviewed</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: colors.warning }]}>{reviews.filter(r => r.status === 'clicked').length}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Clicked</Text>
          </View>
        </View>

        {reviews.length === 0 ? (
          <View style={styles.empty}>
            <Icon name={icons.star} size={48} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No review requests</Text>
            <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>Review requests will appear here</Text>
          </View>
        ) : reviews.map(r => (
          <View key={r.id} style={[styles.card, { backgroundColor: colors.surfaceAlt }]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardInfo}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>{r.contacts?.name || 'Unknown'}</Text>
                <Text style={[styles.cardMeta, { color: colors.textMuted }]}>
                  {r.sent_at ? new Date(r.sent_at).toLocaleDateString() : 'Not sent'}
                  {r.rating && ` • ${r.rating} stars`}
                </Text>
              </View>
              <View style={[styles.badge, { backgroundColor: getStatusColor(r.status) + '15' }]}>
                <Text style={[styles.badgeText, { color: getStatusColor(r.status) }]}>{r.status}</Text>
              </View>
            </View>
            {r.review_text && <Text style={[styles.reviewText, { color: colors.textSecondary }]}>{r.review_text}</Text>}
          </View>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

import { Text } from 'react-native';
const styles = StyleSheet.create({
  container: { flex: 1 }, content: { padding: 16, paddingBottom: 24 },
  settingsCard: { padding: 16, borderRadius: 16, marginBottom: 16, gap: 12 },
  cardTitle: { fontSize: 18, fontWeight: '700' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  saveBtn: { padding: 12, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  statsRow: { flexDirection: 'row', padding: 16, borderRadius: 16, marginBottom: 16 },
  stat: { flex: 1, alignItems: 'center', gap: 4 },
  statNum: { fontSize: 24, fontWeight: '700' },
  statLabel: { fontSize: 12 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600' },
  emptyDesc: { fontSize: 14, textAlign: 'center' },
  card: { padding: 16, borderRadius: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardInfo: { flex: 1, gap: 2 },
  cardMeta: { fontSize: 13 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  reviewText: { fontSize: 14, fontStyle: 'italic' },
});
