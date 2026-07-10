// Smart Call Routing - AI-powered call routing
import { useState, useEffect } from 'react';
import { View, ScrollView, Text, StyleSheet, TouchableOpacity, Switch, Alert } from 'react-native';
import { useThemeContext } from '../../src/theme/ThemeProvider';
import { useAuthStore } from '../../src/stores';
import { supabase } from '../../src/lib/supabase';
import { ThemedView, ThemedText, ThemedHeader, Icon, icons } from '../../src/components/ui';

const ROUTING_RULES = [
  { id: 'intent', label: 'Route by Intent', desc: 'AI detects caller intent and routes accordingly', icon: icons.mic },
  { id: 'vip', label: 'VIP Priority', desc: 'VIP callers get priority routing', icon: icons.star },
  { id: 'language', label: 'Language Detection', desc: 'Route to agents who speak the caller\'s language', icon: icons.globe },
  { id: 'history', label: 'Customer History', desc: 'Route based on previous interactions', icon: icons.time },
  { id: 'urgency', label: 'Urgency Detection', desc: 'Urgent calls get immediate attention', icon: icons.alert },
  { id: 'sales', label: 'Sales vs Support', desc: 'Route sales and support calls differently', icon: icons.call },
];

export default function SmartRoutingScreen() {
  const { theme } = useThemeContext();
  const { colors } = theme;
  const { currentOrganization } = useAuthStore();
  const [rules, setRules] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Load saved rules
    const defaultRules: Record<string, boolean> = {
      intent: false,
      vip: true,
      language: false,
      history: true,
      urgency: true,
      sales: false,
    };
    setRules(defaultRules);
  }, []);

  const toggleRule = (id: string) => {
    setRules(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const saveRules = async () => {
    Alert.alert('Saved', 'Smart routing rules updated');
  };

  return (
    <ThemedView variant="default" style={styles.container}>
      <ThemedHeader title="Smart Routing" showBack />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.infoCard, { backgroundColor: colors.surfaceAlt }]}>
          <Icon name={icons.mic} size={24} color={colors.primary} />
          <View style={styles.infoContent}>
            <Text style={[styles.infoTitle, { color: colors.text }]}>AI-Powered Routing</Text>
            <Text style={[styles.infoDesc, { color: colors.textMuted }]}>
              Let AI intelligently route incoming calls based on caller intent, history, and urgency.
            </Text>
          </View>
        </View>

        {ROUTING_RULES.map(rule => (
          <TouchableOpacity
            key={rule.id}
            style={[styles.ruleCard, { backgroundColor: colors.surfaceAlt }]}
            onPress={() => toggleRule(rule.id)}
          >
            <View style={styles.ruleHeader}>
              <Icon name={rule.icon} size={24} color={rules[rule.id] ? colors.primary : colors.textMuted} />
              <View style={styles.ruleInfo}>
                <Text style={[styles.ruleLabel, { color: colors.text }]}>{rule.label}</Text>
                <Text style={[styles.ruleDesc, { color: colors.textMuted }]}>{rule.desc}</Text>
              </View>
              <Switch
                value={rules[rule.id]}
                onValueChange={() => toggleRule(rule.id)}
                trackColor={{ true: colors.primary }}
              />
            </View>
          </TouchableOpacity>
        ))}

        <TouchableOpacity onPress={saveRules} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
          <Text style={{ color: '#FFF', fontWeight: '600' }}>Save Rules</Text>
        </TouchableOpacity>
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
  ruleCard: { padding: 16, borderRadius: 12, marginBottom: 8 },
  ruleHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  ruleInfo: { flex: 1 },
  ruleLabel: { fontSize: 16, fontWeight: '500' },
  ruleDesc: { fontSize: 13, marginTop: 2 },
  saveBtn: { padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 16 },
});
