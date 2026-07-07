import { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, RefreshControl, StyleSheet, TouchableOpacity, Text, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeContext } from '../../../src/theme/ThemeProvider';
import { useAuthStore, useAppStore } from '../../../src/stores';
import { ThemedView, ThemedText, ThemedCard, ThemedHeader, ThemedButton, Icon, icons } from '../../../src/components/ui';

export default function NumbersScreen() {
  const { theme } = useThemeContext();
  const { colors, borderRadius } = theme;
  const router = useRouter();
  const { currentOrganization, membership } = useAuthStore();
  const { phoneNumbers, loadPhoneNumbers, searchNumbers, buyNumber } = useAppStore();
  const [refreshing, setRefreshing] = useState(false);
  const [buying, setBuying] = useState(false);

  const isAdmin = ['owner', 'admin'].includes(membership?.role || '');

  useEffect(() => {
    if (currentOrganization) {
      loadPhoneNumbers(currentOrganization.id);
    }
  }, [currentOrganization]);

  const onRefresh = useCallback(async () => {
    if (!currentOrganization) return;
    setRefreshing(true);
    await loadPhoneNumbers(currentOrganization.id);
    setRefreshing(false);
  }, [currentOrganization]);

  const handleBuyNumber = async () => {
    if (!currentOrganization) return;

    setBuying(true);
    const { data: numbers, error: searchError } = await searchNumbers(currentOrganization.id);

    if (searchError || !numbers?.length) {
      setBuying(false);
      Alert.alert('No Numbers Available', searchError || 'No phone numbers available in your area.');
      return;
    }

    const number = numbers[0];
    Alert.alert(
      'Buy Phone Number',
      `Purchase ${number.friendly_name || number.phone_number}?\n\nCapabilities: ${[
        number.capabilities?.voice && 'Voice',
        number.capabilities?.sms && 'SMS',
        number.capabilities?.mms && 'MMS',
      ].filter(Boolean).join(', ')}`,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => setBuying(false) },
        {
          text: 'Buy',
          onPress: async () => {
            const { error } = await buyNumber(currentOrganization.id, number.phone_number, number.friendly_name);
            setBuying(false);
            if (error) {
              Alert.alert('Error', error);
            } else {
              Alert.alert('Success', 'Phone number purchased successfully!');
            }
          },
        },
      ]
    );
  };

  const getCapabilityIcons = (capabilities: { voice?: boolean; sms?: boolean; mms?: boolean }) => {
    const caps = [];
    if (capabilities?.voice) caps.push('Voice');
    if (capabilities?.sms) caps.push('SMS');
    if (capabilities?.mms) caps.push('MMS');
    return caps.join(' • ');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'purchased': return colors.success;
      case 'assigned': return colors.primary;
      case 'suspended': return colors.error;
      default: return colors.textMuted;
    }
  };

  return (
    <ThemedView variant="default" style={styles.container}>
      <ThemedHeader
        title="Phone Numbers"
        subtitle={`${phoneNumbers.length} numbers`}
        showBack
        rightAction={
          isAdmin ? (
            <TouchableOpacity onPress={handleBuyNumber} disabled={buying}>
              <ThemedText style={{ color: colors.primary, fontWeight: '600' }}>
                {buying ? 'Searching...' : '+ Buy'}
              </ThemedText>
            </TouchableOpacity>
          ) : undefined
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {phoneNumbers.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name={icons.phonePortrait} size={48} color={colors.textMuted} />
            <ThemedText variant="subtitle" align="center">No phone numbers</ThemedText>
            <ThemedText variant="muted" align="center">
              {isAdmin ? 'Buy a number to get started' : 'No numbers assigned to you yet'}
            </ThemedText>
            {isAdmin && (
              <ThemedButton
                title="Buy Phone Number"
                onPress={handleBuyNumber}
                variant="primary"
                size="md"
                loading={buying}
              />
            )}
          </View>
        ) : (
          phoneNumbers.map((number) => (
            <ThemedCard key={number.id} variant="outlined" padding="lg" style={styles.numberCard}>
              <View style={styles.numberHeader}>
                <View style={styles.numberInfo}>
                  <ThemedText variant="subtitle">{number.formatted_number}</ThemedText>
                  <ThemedText variant="muted">{number.friendly_name || number.type}</ThemedText>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(number.status) + '20' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(number.status) }]}>
                    {number.status}
                  </Text>
                </View>
              </View>

              <View style={styles.capabilities}>
                <ThemedText variant="caption">{getCapabilityIcons(number.capabilities)}</ThemedText>
              </View>

              <View style={styles.numberFeatures}>
                <View style={styles.featureRow}>
                  <Icon name={icons.recording} size={16} color={number.recording_enabled ? colors.success : colors.textMuted} />
                  <ThemedText variant="caption" style={{ color: number.recording_enabled ? colors.text : colors.textMuted }}>
                    Recording {number.recording_enabled ? 'On' : 'Off'}
                  </ThemedText>
                </View>
                <View style={styles.featureRow}>
                  <Icon name={icons.mic} size={16} color={number.transcription_enabled ? colors.success : colors.textMuted} />
                  <ThemedText variant="caption" style={{ color: number.transcription_enabled ? colors.text : colors.textMuted }}>
                    Transcription {number.transcription_enabled ? 'On' : 'Off'}
                  </ThemedText>
                </View>
                <View style={styles.featureRow}>
                  <Icon name={icons.mail} size={16} color={number.voicemail_enabled ? colors.success : colors.textMuted} />
                  <ThemedText variant="caption" style={{ color: number.voicemail_enabled ? colors.text : colors.textMuted }}>
                    Voicemail {number.voicemail_enabled ? 'On' : 'Off'}
                  </ThemedText>
                </View>
              </View>

              {isAdmin && (
                <View style={styles.numberActions}>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.surfaceAlt }]}>
                    <Icon name={icons.settings} size={16} color={colors.icon} />
                    <ThemedText variant="caption">Settings</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.surfaceAlt }]}>
                    <Icon name={icons.people} size={16} color={colors.icon} />
                    <ThemedText variant="caption">Assign</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.surfaceAlt }]}>
                    <Icon name={icons.shield} size={16} color={colors.icon} />
                    <ThemedText variant="caption">IVR</ThemedText>
                  </TouchableOpacity>
                </View>
              )}
            </ThemedCard>
          ))
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  numberCard: { marginBottom: 12 },
  numberHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  numberInfo: { gap: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  capabilities: { marginBottom: 12 },
  numberFeatures: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  numberActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10, borderRadius: 8 },
});
