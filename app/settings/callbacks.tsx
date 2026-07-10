// Smart Callback Queue - Offer callback instead of hold
import { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Text, Alert } from 'react-native';
import { useThemeContext } from '../../src/theme/ThemeProvider';
import { useAuthStore } from '../../src/stores';
import { supabase } from '../../src/lib/supabase';
import { ThemedView, ThemedText, ThemedHeader, Icon, icons } from '../../src/components/ui';

interface CallbackRequest {
  id: string;
  contact_id?: string;
  phone_number: string;
  contact_name?: string;
  requested_at: string;
  status: 'pending' | 'scheduled' | 'completed' | 'canceled';
  scheduled_at?: string;
  notes?: string;
}

export default function CallbackQueueScreen() {
  const { theme } = useThemeContext();
  const { colors } = theme;
  const { currentOrganization } = useAuthStore();
  const [callbacks, setCallbacks] = useState<CallbackRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (currentOrganization?.id) loadCallbacks(); }, [currentOrganization?.id]);

  const loadCallbacks = async () => {
    // Load from calls that are pending callback
    const { data } = await supabase
      .from('calls')
      .select('*, contacts(*)')
      .eq('organization_id', currentOrganization!.id)
      .eq('status', 'no_answer')
      .order('started_at', { ascending: false })
      .limit(20);

    const callbackRequests: CallbackRequest[] = (data || []).map(call => ({
      id: call.id,
      contact_id: call.contact_id,
      phone_number: call.direction === 'inbound' ? call.from_number : call.to_number,
      contact_name: call.contacts?.name,
      requested_at: call.started_at,
      status: 'pending',
    }));

    setCallbacks(callbackRequests);
    setLoading(false);
  };

  const handleCallback = async (callback: CallbackRequest) => {
    Alert.alert('Call Back', `Call ${callback.contact_name || callback.phone_number}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Call', onPress: () => {
        // Navigate to dialpad with number
        // router.push({ pathname: '/dialpad', params: { number: callback.phone_number } });
      }},
    ]);
  };

  const markComplete = async (id: string) => {
    setCallbacks(prev => prev.map(c => c.id === id ? { ...c, status: 'completed' } : c));
  };

  const pendingCount = callbacks.filter(c => c.status === 'pending').length;

  return (
    <ThemedView variant="default" style={styles.container}>
      <ThemedHeader title="Callback Queue" subtitle={`${pendingCount} pending`} showBack />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.infoCard, { backgroundColor: colors.surfaceAlt }]}>
          <Icon name={icons.call} size={20} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.textMuted }]}>
            Missed calls are automatically added to the callback queue. Call them back to keep customers happy.
          </Text>
        </View>

        {callbacks.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name={icons.call} size={48} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No callbacks pending</Text>
            <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>Missed calls will appear here</Text>
          </View>
        ) : callbacks.map(cb => (
          <View key={cb.id} style={[styles.callbackCard, { backgroundColor: colors.surfaceAlt }]}>
            <View style={styles.callbackHeader}>
              <View style={[styles.avatar, { backgroundColor: colors.primary + '15' }]}>
                <Text style={[styles.avatarText, { color: colors.primary }]}>
                  {(cb.contact_name || cb.phone_number)[0].toUpperCase()}
                </Text>
              </View>
              <View style={styles.callbackInfo}>
                <Text style={[styles.callbackName, { color: colors.text }]}>{cb.contact_name || 'Unknown'}</Text>
                <Text style={[styles.callbackPhone, { color: colors.textMuted }]}>{cb.phone_number}</Text>
                <Text style={[styles.callbackTime, { color: colors.textMuted }]}>
                  Missed {getTimeAgo(cb.requested_at)}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(cb.status, colors) + '15' }]}>
                <Text style={[styles.statusText, { color: getStatusColor(cb.status, colors) }]}>{cb.status}</Text>
              </View>
            </View>
            <View style={styles.callbackActions}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                onPress={() => handleCallback(cb)}
              >
                <Icon name={icons.call} size={16} color="#FFF" />
                <Text style={styles.actionBtnText}>Call Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.surface }]}
                onPress={() => markComplete(cb.id)}
              >
                <Icon name={icons.check} size={16} color={colors.success} />
                <Text style={[styles.actionBtnText, { color: colors.success }]}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

function getTimeAgo(dateStr: string): string {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function getStatusColor(status: string, colors: any): string {
  if (status === 'completed') return colors.success;
  if (status === 'scheduled') return colors.primary;
  if (status === 'canceled') return colors.textMuted;
  return colors.warning;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 24 },
  infoCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, marginBottom: 16 },
  infoText: { flex: 1, fontSize: 14 },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600' },
  emptyDesc: { fontSize: 14 },
  callbackCard: { padding: 14, borderRadius: 12, marginBottom: 8 },
  callbackHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '600' },
  callbackInfo: { flex: 1, gap: 2 },
  callbackName: { fontSize: 15, fontWeight: '600' },
  callbackPhone: { fontSize: 13 },
  callbackTime: { fontSize: 12 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  callbackActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 8 },
  actionBtnText: { color: '#FFF', fontWeight: '600', fontSize: 13 },
});
