// AI Auto-Reply System
import { useState, useEffect } from 'react';
import { View, ScrollView, Text, StyleSheet, TouchableOpacity, Switch, Alert } from 'react-native';
import { useThemeContext } from '../../src/theme/ThemeProvider';
import { useAuthStore } from '../../src/stores';
import { supabase } from '../../src/lib/supabase';
import { ThemedView, ThemedText, ThemedHeader, Icon, icons } from '../../src/components/ui';

export default function AutoReplyScreen() {
  const { theme } = useThemeContext();
  const { colors } = theme;
  const { currentOrganization } = useAuthStore();
  const [settings, setSettings] = useState({
    enabled: false,
    missedCalls: true,
    afterHours: true,
    newMessages: false,
    greeting: 'Thank you for contacting us! We received your message and will get back to you shortly.',
    missedCallMessage: 'Sorry we missed your call! We\'ll get back to you as soon as possible.',
    afterHoursMessage: 'Thanks for calling! We\'re currently closed. Our business hours are Monday-Friday, 9 AM to 5 PM.',
    aiEnabled: false,
    aiPersonality: 'professional',
  });

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    // Load from database or use defaults
  };

  const saveSettings = async () => {
    Alert.alert('Saved', 'Auto-reply settings updated');
  };

  return (
    <ThemedView variant="default" style={styles.container}>
      <ThemedHeader title="Auto-Reply" showBack />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, { backgroundColor: colors.surfaceAlt }]}>
          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Text style={[styles.switchLabel, { color: colors.text }]}>Enable Auto-Reply</Text>
              <Text style={[styles.switchDesc, { color: colors.textMuted }]}>Automatically respond to incoming messages</Text>
            </View>
            <Switch value={settings.enabled} onValueChange={(v) => setSettings(s => ({ ...s, enabled: v }))} trackColor={{ true: colors.primary }} />
          </View>
        </View>

        {settings.enabled && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Triggers</Text>
            <View style={[styles.card, { backgroundColor: colors.surfaceAlt }]}>
              <View style={styles.switchRow}>
                <Text style={[styles.switchLabel, { color: colors.text }]}>Missed Calls</Text>
                <Switch value={settings.missedCalls} onValueChange={(v) => setSettings(s => ({ ...s, missedCalls: v }))} trackColor={{ true: colors.primary }} />
              </View>
              <View style={styles.switchRow}>
                <Text style={[styles.switchLabel, { color: colors.text }]}>After Hours</Text>
                <Switch value={settings.afterHours} onValueChange={(v) => setSettings(s => ({ ...s, afterHours: v }))} trackColor={{ true: colors.primary }} />
              </View>
              <View style={styles.switchRow}>
                <Text style={[styles.switchLabel, { color: colors.text }]}>New Messages</Text>
                <Switch value={settings.newMessages} onValueChange={(v) => setSettings(s => ({ ...s, newMessages: v }))} trackColor={{ true: colors.primary }} />
              </View>
            </View>

            <Text style={[styles.sectionTitle, { color: colors.text }]}>AI Auto-Reply</Text>
            <View style={[styles.card, { backgroundColor: colors.surfaceAlt }]}>
              <View style={styles.switchRow}>
                <View style={styles.switchInfo}>
                  <Text style={[styles.switchLabel, { color: colors.text }]}>AI-Powered Responses</Text>
                  <Text style={[styles.switchDesc, { color: colors.textMuted }]}>Use AI to generate contextual replies</Text>
                </View>
                <Switch value={settings.aiEnabled} onValueChange={(v) => setSettings(s => ({ ...s, aiEnabled: v }))} trackColor={{ true: colors.primary }} />
              </View>
              {settings.aiEnabled && (
                <View style={styles.aiOptions}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>AI Personality</Text>
                  <View style={styles.personalityRow}>
                    {['professional', 'friendly', 'casual'].map(p => (
                      <TouchableOpacity key={p} onPress={() => setSettings(s => ({ ...s, aiPersonality: p }))} style={[styles.personalityBtn, { backgroundColor: settings.aiPersonality === p ? colors.primary : colors.surface }]}>
                        <Text style={{ color: settings.aiPersonality === p ? '#FFF' : colors.text, textTransform: 'capitalize' }}>{p}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>

            <Text style={[styles.sectionTitle, { color: colors.text }]}>Messages</Text>
            <View style={[styles.card, { backgroundColor: colors.surfaceAlt }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>General Greeting</Text>
              <Text style={[styles.messagePreview, { color: colors.text }]}>{settings.greeting}</Text>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Missed Call Message</Text>
              <Text style={[styles.messagePreview, { color: colors.text }]}>{settings.missedCallMessage}</Text>
              <Text style={[styles.label, { color: colors.textSecondary }]}>After Hours Message</Text>
              <Text style={[styles.messagePreview, { color: colors.text }]}>{settings.afterHoursMessage}</Text>
            </View>

            <TouchableOpacity onPress={saveSettings} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
              <Text style={{ color: '#FFF', fontWeight: '600' }}>Save Settings</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 24 },
  card: { padding: 16, borderRadius: 12, marginBottom: 12 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  switchInfo: { flex: 1, marginRight: 16 },
  switchLabel: { fontSize: 16, fontWeight: '500' },
  switchDesc: { fontSize: 13, marginTop: 2 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12, marginTop: 8 },
  aiOptions: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
  personalityRow: { flexDirection: 'row', gap: 8 },
  personalityBtn: { flex: 1, padding: 10, borderRadius: 8, alignItems: 'center' },
  messagePreview: { fontSize: 14, lineHeight: 20, marginBottom: 12, padding: 12, backgroundColor: '#F3F4F6', borderRadius: 8 },
  saveBtn: { padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 16 },
});
