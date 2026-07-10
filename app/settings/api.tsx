// API Access - Manage API keys and developer tools
import { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Text, Alert, TextInput } from 'react-native';
import { useThemeContext } from '../../src/theme/ThemeProvider';
import { useAuthStore } from '../../src/stores';
import { supabase } from '../../src/lib/supabase';
import { ThemedView, ThemedText, ThemedHeader, Icon, icons } from '../../src/components/ui';

export default function ApiAccessScreen() {
  const { theme } = useThemeContext();
  const { colors } = theme;
  const { currentOrganization } = useAuthStore();
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [generatedKey, setGeneratedKey] = useState('');

  const generateApiKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = 'ohtry_';
    for (let i = 0; i < 32; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
  };

  const createKey = () => {
    if (!keyName.trim()) {
      Alert.alert('Error', 'Key name required');
      return;
    }
    const key = generateApiKey();
    setGeneratedKey(key);
    setApiKeys(prev => [...prev, { name: keyName.trim(), key, created: new Date().toISOString() }]);
    setKeyName('');
    setShowCreate(false);
  };

  const revokeKey = (index: number) => {
    Alert.alert('Revoke', 'Revoke this API key? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Revoke', style: 'destructive', onPress: () => setApiKeys(prev => prev.filter((_, i) => i !== index)) },
    ]);
  };

  const copyKey = (key: string) => {
    // In a real app, copy to clipboard
    Alert.alert('Copied', 'API key copied to clipboard');
  };

  return (
    <ThemedView variant="default" style={styles.container}>
      <ThemedHeader title="API Access" showBack />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.infoCard, { backgroundColor: colors.surfaceAlt }]}>
          <Icon name={icons.globe} size={24} color={colors.primary} />
          <View style={styles.infoContent}>
            <Text style={[styles.infoTitle, { color: colors.text }]}>Developer API</Text>
            <Text style={[styles.infoDesc, { color: colors.textMuted }]}>
              Use API keys to integrate OhTry Mobile with your applications.
            </Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>API Keys</Text>

        {generatedKey && (
          <View style={[styles.keyCard, { backgroundColor: colors.success + '10', borderColor: colors.success }]}>
            <Text style={[styles.keyLabel, { color: colors.success }]}>New API Key Generated</Text>
            <Text style={[styles.keyValue, { color: colors.text }]}>{generatedKey}</Text>
            <Text style={[styles.keyWarning, { color: colors.warning }]}>
              Copy this key now. You won't be able to see it again.
            </Text>
            <TouchableOpacity onPress={() => copyKey(generatedKey)} style={[styles.copyBtn, { backgroundColor: colors.success }]}>
              <Text style={{ color: '#FFF', fontWeight: '600' }}>Copy Key</Text>
            </TouchableOpacity>
          </View>
        )}

        {showCreate && (
          <View style={[styles.createCard, { backgroundColor: colors.surfaceAlt }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Create API Key</Text>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Key Name</Text>
            <TextInput
              style={[styles.input, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
              placeholder="e.g., Production, Development"
              placeholderTextColor={colors.textMuted}
              value={keyName}
              onChangeText={setKeyName}
            />
            <View style={styles.actions}>
              <TouchableOpacity onPress={() => setShowCreate(false)} style={[styles.cancelBtn, { borderColor: colors.border }]}>
                <Text style={{ color: colors.text }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={createKey} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
                <Text style={{ color: '#FFF', fontWeight: '600' }}>Generate Key</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {apiKeys.length === 0 && !showCreate ? (
          <View style={styles.empty}>
            <Icon name={icons.key} size={48} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No API keys</Text>
            <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>Create an API key to get started</Text>
          </View>
        ) : apiKeys.map((apiKey, index) => (
          <View key={index} style={[styles.keyItem, { backgroundColor: colors.surfaceAlt }]}>
            <View style={styles.keyHeader}>
              <Icon name={icons.key} size={20} color={colors.primary} />
              <View style={styles.keyInfo}>
                <Text style={[styles.keyName, { color: colors.text }]}>{apiKey.name}</Text>
                <Text style={[styles.keyDate, { color: colors.textMuted }]}>
                  Created {new Date(apiKey.created).toLocaleDateString()}
                </Text>
              </View>
              <TouchableOpacity onPress={() => revokeKey(index)}>
                <Text style={{ color: colors.error, fontSize: 13 }}>Revoke</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <TouchableOpacity onPress={() => setShowCreate(true)} style={[styles.addBtn, { borderColor: colors.primary }]}>
          <Icon name={icons.add} size={20} color={colors.primary} />
          <Text style={{ color: colors.primary, fontWeight: '600' }}>Create API Key</Text>
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Documentation</Text>
        <View style={[styles.docCard, { backgroundColor: colors.surfaceAlt }]}>
          <Text style={[styles.docTitle, { color: colors.text }]}>API Reference</Text>
          <Text style={[styles.docDesc, { color: colors.textMuted }]}>
            Learn how to integrate with OhTry Mobile API for calls, messages, contacts, and more.
          </Text>
          <TouchableOpacity style={[styles.docBtn, { backgroundColor: colors.primary }]}>
            <Text style={{ color: '#FFF', fontWeight: '600' }}>View Documentation</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 24 },
  infoCard: { flexDirection: 'row', padding: 16, borderRadius: 12, marginBottom: 20, gap: 12 },
  infoContent: { flex: 1 },
  infoTitle: { fontSize: 16, fontWeight: '600' },
  infoDesc: { fontSize: 14, marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12, marginTop: 8 },
  keyCard: { padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1 },
  keyLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  keyValue: { fontSize: 14, fontFamily: 'monospace', padding: 12, backgroundColor: '#F3F4F6', borderRadius: 8 },
  keyWarning: { fontSize: 13, marginTop: 8 },
  copyBtn: { padding: 10, borderRadius: 8, alignItems: 'center', marginTop: 12 },
  createCard: { padding: 16, borderRadius: 16, marginBottom: 16, gap: 12 },
  cardTitle: { fontSize: 18, fontWeight: '700' },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1 },
  saveBtn: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center' },
  empty: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600' },
  emptyDesc: { fontSize: 14 },
  keyItem: { padding: 14, borderRadius: 12, marginBottom: 8 },
  keyHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  keyInfo: { flex: 1 },
  keyName: { fontSize: 15, fontWeight: '600' },
  keyDate: { fontSize: 12, marginTop: 2 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', marginTop: 8 },
  docCard: { padding: 16, borderRadius: 12, marginBottom: 16 },
  docTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  docDesc: { fontSize: 14, marginBottom: 12 },
  docBtn: { padding: 12, borderRadius: 8, alignItems: 'center' },
});
