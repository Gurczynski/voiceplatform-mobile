// AI Call Simulator - Train employees with AI callers
import { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useThemeContext } from '../../src/theme/ThemeProvider';
import { useAuthStore } from '../../src/stores';
import { supabase } from '../../src/lib/supabase';
import { ThemedView, ThemedText, ThemedHeader, Icon, icons } from '../../src/components/ui';

const SCENARIOS = [
  { type: 'angry_customer', label: 'Angry Customer', icon: '😤', desc: 'Handle an upset customer', difficulty: 'hard' },
  { type: 'new_lead', label: 'New Lead', icon: '🎯', desc: 'Qualify a potential customer', difficulty: 'medium' },
  { type: 'billing_dispute', label: 'Billing Dispute', icon: '💰', desc: 'Resolve a billing issue', difficulty: 'hard' },
  { type: 'support_issue', label: 'Support Issue', icon: '🔧', desc: 'Help with a technical problem', difficulty: 'medium' },
  { type: 'urgent_request', label: 'Urgent Request', icon: '🚨', desc: 'Handle an urgent situation', difficulty: 'hard' },
  { type: 'general', label: 'General Inquiry', icon: '📞', desc: 'Handle a general question', difficulty: 'easy' },
];

export default function SimulatorScreen() {
  const { theme } = useThemeContext();
  const { colors } = theme;
  const { currentOrganization, user } = useAuthStore();
  const [sessions, setSessions] = useState<any[]>([]);
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [activeScenario, setActiveScenario] = useState<string | null>(null);

  useEffect(() => { if (currentOrganization?.id) { loadSessions(); loadScenarios(); } }, [currentOrganization?.id]);

  const loadSessions = async () => {
    const { data } = await supabase.from('training_sessions').select('*, training_scenarios(*)').eq('organization_id', currentOrganization!.id).eq('user_id', user!.id).order('created_at', { ascending: false }).limit(20);
    setSessions(data || []);
  };

  const loadScenarios = async () => {
    const { data } = await supabase.from('training_scenarios').select('*').eq('organization_id', currentOrganization!.id).eq('is_active', true);
    setScenarios(data || []);
  };

  const startSimulation = async (scenarioType: string) => {
    const scenario = SCENARIOS.find(s => s.type === scenarioType);
    Alert.alert('Start Training', `Start ${scenario?.label || scenarioType} simulation?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Start', onPress: async () => {
        const { data } = await supabase.from('training_sessions').insert({
          organization_id: currentOrganization!.id, user_id: user!.id,
          scenario_id: scenarios.find(s => s.scenario_type === scenarioType)?.id,
          status: 'in_progress',
        }).select().single();
        setActiveScenario(scenarioType);
        // In a real app, this would start a voice conversation with AI
        Alert.alert('Simulation Started', 'The AI caller will now begin the scenario. Respond as you would in a real call.');
      }},
    ]);
  };

  const endSimulation = async (sessionId: string) => {
    const score = Math.floor(Math.random() * 40) + 60; // Simulated score
    await supabase.from('training_sessions').update({
      score, max_score: 100, completed_at: new Date().toISOString(),
      feedback: 'Good job handling the call. Consider being more empathetic.',
    }).eq('id', sessionId);
    setActiveScenario(null);
    loadSessions();
  };

  const getDifficultyColor = (d: string) => {
    if (d === 'hard') return colors.error;
    if (d === 'medium') return colors.warning;
    return colors.success;
  };

  const avgScore = sessions.filter(s => s.score).length > 0
    ? sessions.filter(s => s.score).reduce((sum, s) => sum + s.score, 0) / sessions.filter(s => s.score).length
    : 0;

  return (
    <ThemedView variant="default" style={styles.container}>
      <ThemedHeader title="Call Simulator" showBack />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.statsRow, { backgroundColor: colors.surfaceAlt }]}>
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: colors.primary }]}>{sessions.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Sessions</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: colors.success }]}>{avgScore.toFixed(0)}%</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Avg Score</Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Training Scenarios</Text>
        <View style={styles.scenarioGrid}>
          {SCENARIOS.map(s => (
            <TouchableOpacity key={s.type} style={[styles.scenarioCard, { backgroundColor: colors.surfaceAlt }]} onPress={() => startSimulation(s.type)}>
              <Text style={styles.scenarioIcon}>{s.icon}</Text>
              <Text style={[styles.scenarioLabel, { color: colors.text }]}>{s.label}</Text>
              <Text style={[styles.scenarioDesc, { color: colors.textMuted }]}>{s.desc}</Text>
              <View style={[styles.diffBadge, { backgroundColor: getDifficultyColor(s.difficulty) + '15' }]}>
                <Text style={[styles.diffText, { color: getDifficultyColor(s.difficulty) }]}>{s.difficulty}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Sessions</Text>
        {sessions.length === 0 ? (
          <View style={styles.empty}>
            <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>No training sessions yet</Text>
          </View>
        ) : sessions.map(s => (
          <View key={s.id} style={[styles.card, { backgroundColor: colors.surfaceAlt }]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardInfo}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>{s.training_scenarios?.name || 'Training'}</Text>
                <Text style={[styles.cardMeta, { color: colors.textMuted }]}>
                  {s.completed_at ? new Date(s.completed_at).toLocaleDateString() : 'In progress'}
                </Text>
              </View>
              {s.score !== null && (
                <Text style={[styles.scoreText, { color: s.score >= 80 ? colors.success : s.score >= 60 ? colors.warning : colors.error }]}>
                  {s.score}%
                </Text>
              )}
            </View>
            {s.feedback && <Text style={[styles.feedback, { color: colors.textSecondary }]}>{s.feedback}</Text>}
          </View>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

import { Text } from 'react-native';
const styles = StyleSheet.create({
  container: { flex: 1 }, content: { padding: 16, paddingBottom: 24 },
  statsRow: { flexDirection: 'row', padding: 16, borderRadius: 16, marginBottom: 16 },
  stat: { flex: 1, alignItems: 'center', gap: 4 },
  statNum: { fontSize: 24, fontWeight: '700' },
  statLabel: { fontSize: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12, marginTop: 8 },
  scenarioGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  scenarioCard: { width: '47%', padding: 16, borderRadius: 16, alignItems: 'center', gap: 8 },
  scenarioIcon: { fontSize: 32 },
  scenarioLabel: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
  scenarioDesc: { fontSize: 12, textAlign: 'center' },
  diffBadge: { paddingHorizontal: 10, paddingVertical: 2, borderRadius: 8 },
  diffText: { fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyDesc: { fontSize: 14 },
  card: { padding: 14, borderRadius: 12, marginBottom: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardInfo: { flex: 1, gap: 2 },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  cardMeta: { fontSize: 12 },
  scoreText: { fontSize: 20, fontWeight: '700' },
  feedback: { fontSize: 13, marginTop: 8, fontStyle: 'italic' },
});
