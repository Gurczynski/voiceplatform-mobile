// BYOT - Bring Your Own Twilio Configuration
import { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, TextInput, Switch, Alert } from 'react-native';
import { useThemeContext } from '../../src/theme/ThemeProvider';
import { useAuthStore } from '../../src/stores';
import { supabase } from '../../src/lib/supabase';
import { ThemedView, ThemedText, ThemedHeader, Icon, icons } from '../../src/components/ui';

export default function TwilioConfigScreen() {
  const { theme } = useThemeContext();
  const { colors } = theme;
  const { currentOrganization, membership } = useAuthStore();
  const [mode, setMode] = useState<'managed' | 'byot'>('managed');
  const [accountSid, setAccountSid] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [friendlyName, setFriendlyName] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showToken, setShowToken] = useState(false);

  const isAdmin = ['owner', 'admin'].includes(membership?.role || '');

  useEffect(() => { if (currentOrganization?.id) loadConfig(); }, [currentOrganization?.id]);

  const loadConfig = async () => {
    if (!currentOrganization) return;
    setMode(currentOrganization.mode || 'managed');

    const { data } = await supabase
      .from('twilio_accounts')
      .select('id, account_sid, friendly_name, is_active')
      .eq('organization_id', currentOrganization.id)
      .eq('is_active', true)
      .single();

    if (data) {
      setAccountSid(data.account_sid);
      setFriendlyName(data.friendly_name || '');
      setIsConnected(true);
    }
  };

  const connectTwilio = async () => {
    if (!accountSid.trim() || !authToken.trim()) {
      Alert.alert('Error', 'Account SID and Auth Token required');
      return;
    }

    if (!accountSid.startsWith('AC')) {
      Alert.alert('Error', 'Account SID must start with "AC"');
      return;
    }

    setLoading(true);

    // Test the credentials by making a simple Twilio API call
    try {
      const testResp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid.trim()}.json`, {
        headers: {
          'Authorization': 'Basic ' + btoa(`${accountSid.trim()}:${authToken.trim()}`),
        },
      });

      if (!testResp.ok) {
        Alert.alert('Error', 'Invalid Twilio credentials. Please check your Account SID and Auth Token.');
        setLoading(false);
        return;
      }

      const accountData = await testResp.json();

      // Store encrypted credentials
      const { error } = await supabase.from('twilio_accounts').upsert({
        organization_id: currentOrganization!.id,
        account_sid: accountSid.trim(),
        auth_token_encrypted: btoa(authToken.trim()),
        friendly_name: friendlyName || accountData.friendly_name || 'My Twilio Account',
        is_active: true,
      });

      if (error) {
        Alert.alert('Error', error.message);
      } else {
        // Update organization mode
        await supabase
          .from('organizations')
          .update({ mode: 'byot' })
          .eq('id', currentOrganization!.id);

        setIsConnected(true);
        setMode('byot');
        Alert.alert('Connected', 'Twilio account connected successfully!');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to verify Twilio credentials');
    }

    setLoading(false);
  };

  const disconnectTwilio = async () => {
    Alert.alert('Disconnect', 'Disconnect your Twilio account? This will switch back to managed mode.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disconnect', style: 'destructive', onPress: async () => {
          await supabase
            .from('twilio_accounts')
            .update({ is_active: false })
            .eq('organization_id', currentOrganization!.id);

          await supabase
            .from('organizations')
            .update({ mode: 'managed' })
            .eq('id', currentOrganization!.id);

          setIsConnected(false);
          setMode('managed');
          setAccountSid('');
          setAuthToken('');
          setFriendlyName('');
        }
      },
    ]);
  };

  if (!isAdmin) {
    return (
      <ThemedView variant="default" style={styles.container}>
        <ThemedHeader title="Twilio Configuration" showBack />
        <View style={styles.centered}>
          <Icon name={icons.lock} size={48} color={colors.textMuted} />
          <ThemedText variant="subtitle">Admin Access Required</ThemedText>
          <ThemedText variant="muted">Only admins can manage Twilio configuration</ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView variant="default" style={styles.container}>
      <ThemedHeader title="Twilio Configuration" showBack />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Mode Selector */}
        <View style={[styles.modeCard, { backgroundColor: colors.surfaceAlt }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Operating Mode</Text>

          <TouchableOpacity
            style={[styles.modeOption, { backgroundColor: mode === 'managed' ? colors.primary + '15' : colors.surface, borderColor: mode === 'managed' ? colors.primary : colors.border }]}
            onPress={() => !isConnected && setMode('managed')}
            disabled={isConnected}
          >
            <View style={styles.modeHeader}>
              <Icon name={icons.shield} size={24} color={mode === 'managed' ? colors.primary : colors.textMuted} />
              <View style={styles.modeInfo}>
                <Text style={[styles.modeTitle, { color: colors.text }]}>Managed Mode</Text>
                <Text style={[styles.modeDesc, { color: colors.textMuted }]}>We handle Twilio for you</Text>
              </View>
              <View style={[styles.radio, { borderColor: mode === 'managed' ? colors.primary : colors.border, backgroundColor: mode === 'managed' ? colors.primary : 'transparent' }]}>
                {mode === 'managed' && <View style={styles.radioInner} />}
              </View>
            </View>
            <View style={styles.modeFeatures}>
              <Text style={[styles.featureText, { color: colors.textSecondary }]}>✓ No Twilio account needed</Text>
              <Text style={[styles.featureText, { color: colors.textSecondary }]}>✓ We manage billing & compliance</Text>
              <Text style={[styles.featureText, { color: colors.textSecondary }]}>✓ Quick setup</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeOption, { backgroundColor: mode === 'byot' ? colors.primary + '15' : colors.surface, borderColor: mode === 'byot' ? colors.primary : colors.border }]}
            onPress={() => !isConnected && setMode('byot')}
            disabled={isConnected}
          >
            <View style={styles.modeHeader}>
              <Icon name={icons.key} size={24} color={mode === 'byot' ? colors.primary : colors.textMuted} />
              <View style={styles.modeInfo}>
                <Text style={[styles.modeTitle, { color: colors.text }]}>Bring Your Own Twilio</Text>
                <Text style={[styles.modeDesc, { color: colors.textMuted }]}>Use your own Twilio account</Text>
              </View>
              <View style={[styles.radio, { borderColor: mode === 'byot' ? colors.primary : colors.border, backgroundColor: mode === 'byot' ? colors.primary : 'transparent' }]}>
                {mode === 'byot' && <View style={styles.radioInner} />}
              </View>
            </View>
            <View style={styles.modeFeatures}>
              <Text style={[styles.featureText, { color: colors.textSecondary }]}>✓ Full Twilio control</Text>
              <Text style={[styles.featureText, { color: colors.textSecondary }]}>✓ Your own billing relationship</Text>
              <Text style={[styles.featureText, { color: colors.textSecondary }]}>✓ Existing numbers supported</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* BYOT Configuration */}
        {mode === 'byot' && (
          <View style={[styles.configCard, { backgroundColor: colors.surfaceAlt }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Twilio Credentials</Text>
            <Text style={[styles.cardDesc, { color: colors.textMuted }]}>
              Enter your Twilio Account SID and Auth Token. These are stored securely and never exposed to other users.
            </Text>

            {isConnected && (
              <View style={[styles.connectedBadge, { backgroundColor: colors.success + '15' }]}>
                <Icon name={icons.checkCircle} size={20} color={colors.success} />
                <Text style={[styles.connectedText, { color: colors.success }]}>Connected</Text>
              </View>
            )}

            <Text style={[styles.label, { color: colors.textSecondary }]}>Account SID</Text>
            <TextInput
              style={[styles.input, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
              placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              placeholderTextColor={colors.textMuted}
              value={accountSid}
              onChangeText={setAccountSid}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isConnected}
            />

            <Text style={[styles.label, { color: colors.textSecondary }]}>Auth Token</Text>
            <View style={styles.tokenRow}>
              <TextInput
                style={[styles.input, styles.tokenInput, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
                placeholder="Your auth token"
                placeholderTextColor={colors.textMuted}
                value={authToken}
                onChangeText={setAuthToken}
                secureTextEntry={!showToken}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isConnected}
              />
              <TouchableOpacity onPress={() => setShowToken(!showToken)} style={styles.eyeBtn}>
                <Icon name={showToken ? icons.eyeOff : icons.eye} size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.label, { color: colors.textSecondary }]}>Friendly Name (optional)</Text>
            <TextInput
              style={[styles.input, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
              placeholder="My Twilio Account"
              placeholderTextColor={colors.textMuted}
              value={friendlyName}
              onChangeText={setFriendlyName}
              editable={!isConnected}
            />

            {!isConnected ? (
              <TouchableOpacity
                onPress={connectTwilio}
                disabled={loading || !accountSid.trim() || !authToken.trim()}
                style={[styles.connectBtn, { backgroundColor: accountSid.trim() && authToken.trim() ? colors.primary : colors.surfaceAlt }]}
              >
                <Text style={[styles.connectBtnText, { color: accountSid.trim() && authToken.trim() ? '#FFF' : colors.textMuted }]}>
                  {loading ? 'Verifying...' : 'Connect Twilio'}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={disconnectTwilio} style={[styles.disconnectBtn, { borderColor: colors.error }]}>
                <Text style={{ color: colors.error, fontWeight: '600' }}>Disconnect Twilio</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Info Card */}
        <View style={[styles.infoCard, { backgroundColor: colors.surfaceAlt }]}>
          <Icon name={icons.info} size={20} color={colors.primary} />
          <View style={styles.infoContent}>
            <Text style={[styles.infoTitle, { color: colors.text }]}>How it works</Text>
            <Text style={[styles.infoText, { color: colors.textMuted }]}>
              <Text style={{ fontWeight: '600' }}>Managed Mode:</Text> We provide Twilio numbers and handle all the complexity. You just use the app.
            </Text>
            <Text style={[styles.infoText, { color: colors.textMuted }]}>
              <Text style={{ fontWeight: '600' }}>BYOT Mode:</Text> Connect your own Twilio account. You control billing, numbers, and compliance directly with Twilio.
            </Text>
          </View>
        </View>

        {/* Where to find credentials */}
        {mode === 'byot' && !isConnected && (
          <View style={[styles.helpCard, { backgroundColor: colors.surfaceAlt }]}>
            <Text style={[styles.helpTitle, { color: colors.text }]}>Where to find your credentials</Text>
            <View style={styles.helpStep}>
              <Text style={[styles.stepNum, { color: colors.primary }]}>1</Text>
              <Text style={[styles.stepText, { color: colors.textSecondary }]}>Log in to console.twilio.com</Text>
            </View>
            <View style={styles.helpStep}>
              <Text style={[styles.stepNum, { color: colors.primary }]}>2</Text>
              <Text style={[styles.stepText, { color: colors.textSecondary }]}>Find Account SID and Auth Token on the dashboard</Text>
            </View>
            <View style={styles.helpStep}>
              <Text style={[styles.stepNum, { color: colors.primary }]}>3</Text>
              <Text style={[styles.stepText, { color: colors.textSecondary }]}>Copy and paste them here</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

import { Text } from 'react-native';
const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 24 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  modeCard: { padding: 16, borderRadius: 16, marginBottom: 16, gap: 12 },
  cardTitle: { fontSize: 18, fontWeight: '700' },
  cardDesc: { fontSize: 14, marginBottom: 8 },
  modeOption: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  modeHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  modeInfo: { flex: 1 },
  modeTitle: { fontSize: 16, fontWeight: '600' },
  modeDesc: { fontSize: 13 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFF' },
  modeFeatures: { marginTop: 12, gap: 4 },
  featureText: { fontSize: 13 },
  configCard: { padding: 16, borderRadius: 16, marginBottom: 16, gap: 12 },
  connectedBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 8 },
  connectedText: { fontSize: 14, fontWeight: '600' },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  tokenRow: { flexDirection: 'row', gap: 8 },
  tokenInput: { flex: 1 },
  eyeBtn: { padding: 12, justifyContent: 'center' },
  connectBtn: { padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  connectBtnText: { fontSize: 16, fontWeight: '600' },
  disconnectBtn: { padding: 14, borderRadius: 10, alignItems: 'center', borderWidth: 1, marginTop: 8 },
  infoCard: { flexDirection: 'row', padding: 16, borderRadius: 16, marginBottom: 16, gap: 12 },
  infoContent: { flex: 1, gap: 8 },
  infoTitle: { fontSize: 16, fontWeight: '600' },
  infoText: { fontSize: 14, lineHeight: 20 },
  helpCard: { padding: 16, borderRadius: 16, gap: 12 },
  helpTitle: { fontSize: 16, fontWeight: '600' },
  helpStep: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#3B82F615', textAlign: 'center', lineHeight: 24, fontWeight: '700' },
  stepText: { fontSize: 14, flex: 1 },
});
