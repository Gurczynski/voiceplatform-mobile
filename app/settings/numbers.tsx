// Phone Numbers Management - Professional Quality
import { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, RefreshControl, StyleSheet, TouchableOpacity, Text, Alert, Modal, TextInput } from 'react-native';
import { useThemeContext } from '../../src/theme/ThemeProvider';
import { useAuthStore, useAppStore } from '../../src/stores';
import { ThemedView, ThemedText, ThemedHeader, Icon, icons } from '../../src/components/ui';

export default function NumbersScreen() {
  const { theme } = useThemeContext();
  const { colors } = theme;
  const { currentOrganization, membership } = useAuthStore();
  const { phoneNumbers, loadPhoneNumbers, searchNumbers, buyNumber } = useAppStore();
  const [refreshing, setRefreshing] = useState(false);
  const [showBuy, setShowBuy] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [areaCode, setAreaCode] = useState('');
  const isAdmin = ['owner', 'admin'].includes(membership?.role || '');

  useEffect(() => { if (currentOrganization?.id) loadPhoneNumbers(currentOrganization.id); }, [currentOrganization?.id]);

  const onRefresh = useCallback(async () => {
    if (!currentOrganization?.id) return;
    setRefreshing(true);
    await loadPhoneNumbers(currentOrganization.id);
    setRefreshing(false);
  }, [currentOrganization?.id]);

  const handleSearch = async () => {
    if (!currentOrganization?.id) return;
    setSearching(true);
    const { data } = await searchNumbers(currentOrganization.id, { areaCode: areaCode || undefined });
    setSearchResults(data || []);
    setSearching(false);
  };

  const handleBuy = async (phoneNumber: string, friendlyName: string) => {
    if (!currentOrganization?.id) return;
    Alert.alert('Purchase Number', `Buy ${phoneNumber}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Buy', onPress: async () => {
          const { error } = await buyNumber(currentOrganization.id, phoneNumber, friendlyName);
          if (error) Alert.alert('Error', error);
          else { Alert.alert('Success', 'Number purchased!'); setShowBuy(false); setSearchResults([]); }
        }
      },
    ]);
  };

  const getCapabilities = (caps: any) => {
    if (!caps) return [];
    const list = [];
    if (caps.voice) list.push('Voice');
    if (caps.sms) list.push('SMS');
    if (caps.mms) list.push('MMS');
    return list;
  };

  return (
    <ThemedView variant="default" style={styles.container}>
      <ThemedHeader
        title="Phone Numbers"
        showBack
        rightAction={isAdmin ? (
          <TouchableOpacity onPress={() => setShowBuy(true)} style={[styles.buyBtn, { backgroundColor: colors.primary }]}>
            <Icon name={icons.add} size={18} color="#FFF" />
            <Text style={styles.buyBtnText}>Buy Number</Text>
          </TouchableOpacity>
        ) : undefined}
      />

      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
        {phoneNumbers.length === 0 ? (
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceAlt }]}>
              <Icon name={icons.phonePortrait} size={48} color={colors.textMuted} />
            </View>
            <ThemedText variant="subtitle">No phone numbers</ThemedText>
            <ThemedText variant="muted" align="center">{isAdmin ? 'Purchase a number to start receiving calls and messages' : 'No numbers assigned to you yet'}</ThemedText>
            {isAdmin && (
              <TouchableOpacity onPress={() => setShowBuy(true)} style={[styles.primaryBtn, { backgroundColor: colors.primary }]}>
                <Icon name={icons.add} size={20} color="#FFF" />
                <Text style={styles.primaryBtnText}>Buy Phone Number</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : phoneNumbers.map(num => (
          <View key={num.id} style={[styles.card, { backgroundColor: colors.surfaceAlt }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.numIcon, { backgroundColor: colors.primary + '15' }]}>
                <Icon name={icons.phonePortrait} size={24} color={colors.primary} />
              </View>
              <View style={styles.numInfo}>
                <ThemedText variant="subtitle">{num.formatted_number}</ThemedText>
                <ThemedText variant="muted">{num.friendly_name || num.type}</ThemedText>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: num.status === 'purchased' ? colors.success + '15' : colors.primary + '15' }]}>
                <Text style={[styles.statusText, { color: num.status === 'purchased' ? colors.success : colors.primary }]}>{num.status}</Text>
              </View>
            </View>

            <View style={styles.capRow}>
              {getCapabilities(num.capabilities).map(cap => (
                <View key={cap} style={[styles.capBadge, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.capText, { color: colors.textSecondary }]}>{cap}</Text>
                </View>
              ))}
            </View>

            <View style={styles.featureGrid}>
              <View style={styles.featureItem}>
                <Icon name={icons.recording} size={16} color={num.recording_enabled ? colors.success : colors.textMuted} />
                <Text style={[styles.featureLabel, { color: num.recording_enabled ? colors.text : colors.textMuted }]}>Recording</Text>
              </View>
              <View style={styles.featureItem}>
                <Icon name={icons.mic} size={16} color={num.transcription_enabled ? colors.success : colors.textMuted} />
                <Text style={[styles.featureLabel, { color: num.transcription_enabled ? colors.text : colors.textMuted }]}>Transcription</Text>
              </View>
              <View style={styles.featureItem}>
                <Icon name={icons.mail} size={16} color={num.voicemail_enabled ? colors.success : colors.textMuted} />
                <Text style={[styles.featureLabel, { color: num.voicemail_enabled ? colors.text : colors.textMuted }]}>Voicemail</Text>
              </View>
              <View style={styles.featureItem}>
                <Icon name={icons.mic} size={16} color={num.ai_receptionist_enabled ? colors.success : colors.textMuted} />
                <Text style={[styles.featureLabel, { color: num.ai_receptionist_enabled ? colors.text : colors.textMuted }]}>AI Agent</Text>
              </View>
            </View>

            {isAdmin && (
              <View style={styles.actionRow}>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.surface }]}>
                  <Icon name={icons.settings} size={16} color={colors.primary} />
                  <Text style={[styles.actionText, { color: colors.primary }]}>Settings</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.surface }]}>
                  <Icon name={icons.people} size={16} color={colors.primary} />
                  <Text style={[styles.actionText, { color: colors.primary }]}>Assign</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.surface }]}>
                  <Icon name={icons.shield} size={16} color={colors.primary} />
                  <Text style={[styles.actionText, { color: colors.primary }]}>IVR</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      {/* Buy Number Modal */}
      <Modal visible={showBuy} animationType="slide" presentationStyle="pageSheet">
        <ThemedView variant="default" style={styles.modal}>
          <ThemedHeader title="Buy Number" showBack rightAction={
            <TouchableOpacity onPress={() => setShowBuy(false)}>
              <Text style={{ color: colors.primary, fontWeight: '600' }}>Close</Text>
            </TouchableOpacity>
          } />
          <ScrollView contentContainerStyle={styles.modalContent}>
            <View style={[styles.searchBox, { backgroundColor: colors.surfaceAlt }]}>
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Area code (optional)"
                placeholderTextColor={colors.textMuted}
                value={areaCode}
                onChangeText={setAreaCode}
                keyboardType="number-pad"
                maxLength={3}
              />
              <TouchableOpacity onPress={handleSearch} style={[styles.searchBtn, { backgroundColor: colors.primary }]}>
                <Text style={styles.searchBtnText}>{searching ? 'Searching...' : 'Search'}</Text>
              </TouchableOpacity>
            </View>

            {searchResults.length === 0 && !searching && (
              <View style={styles.emptySearch}>
                <Icon name={icons.search} size={48} color={colors.textMuted} />
                <ThemedText variant="muted">Search for available numbers</ThemedText>
              </View>
            )}

            {searchResults.map((num, idx) => (
              <TouchableOpacity
                key={idx}
                style={[styles.resultCard, { backgroundColor: colors.surfaceAlt }]}
                onPress={() => handleBuy(num.phone_number, num.friendly_name || num.phone_number)}
              >
                <View style={styles.resultInfo}>
                  <ThemedText variant="body" weight="600">{num.friendly_name || num.phone_number}</ThemedText>
                  <ThemedText variant="caption">{num.locality}, {num.region}</ThemedText>
                  <View style={styles.resultCaps}>
                    {num.capabilities?.voice && <Text style={[styles.capTag, { color: colors.primary }]}>Voice</Text>}
                    {num.capabilities?.sms && <Text style={[styles.capTag, { color: colors.primary }]}>SMS</Text>}
                    {num.capabilities?.mms && <Text style={[styles.capTag, { color: colors.primary }]}>MMS</Text>}
                  </View>
                </View>
                <Icon name={icons.add} size={20} color={colors.primary} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </ThemedView>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 24 },
  buyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  buyBtnText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyIcon: { width: 80, height: 80, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  card: { padding: 16, borderRadius: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  numIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  numInfo: { flex: 1, gap: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  capRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  capBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  capText: { fontSize: 12, fontWeight: '500' },
  featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 12 },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: 6, width: '45%' },
  featureLabel: { fontSize: 13 },
  actionRow: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10 },
  actionText: { fontSize: 13, fontWeight: '600' },
  modal: { flex: 1 },
  modalContent: { padding: 16 },
  searchBox: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  searchInput: { flex: 1, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, borderRadius: 12 },
  searchBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, justifyContent: 'center' },
  searchBtnText: { color: '#FFF', fontWeight: '600' },
  emptySearch: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  resultCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 8 },
  resultInfo: { flex: 1, gap: 4 },
  resultCaps: { flexDirection: 'row', gap: 8, marginTop: 4 },
  capTag: { fontSize: 12, fontWeight: '500' },
});
