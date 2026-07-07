// QA Scorecards - Score and evaluate calls
import { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useThemeContext } from '../../src/theme/ThemeProvider';
import { useAuthStore } from '../../src/stores';
import { supabase } from '../../src/lib/supabase';
import { ThemedView, ThemedText, ThemedHeader, Icon, icons } from '../../src/components/ui';

export default function QAScreen() {
  const { theme } = useThemeContext();
  const { colors } = theme;
  const { currentOrganization } = useAuthStore();
  const [scorecards, setScorecards] = useState<any[]>([]);
  const [scores, setScores] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [criteria, setCriteria] = useState('');

  useEffect(() => { if (currentOrganization?.id) { loadScorecards(); loadScores(); } }, [currentOrganization?.id]);

  const loadScorecards = async () => {
    const { data } = await supabase.from('qa_scorecard_templates').select('*').eq('organization_id', currentOrganization!.id);
    setScorecards(data || []);
  };

  const loadScores = async () => {
    const { data } = await supabase.from('qa_scores').select('*, calls(*, contacts(*)), user_profiles(*)').eq('organization_id', currentOrganization!.id).order('created_at', { ascending: false }).limit(50);
    setScores(data || []);
  };

  const createScorecard = async () => {
    if (!name.trim()) { Alert.alert('Error', 'Name required'); return; }
    const criteriaList = criteria.split('\n').filter(Boolean).map((c, i) => ({ id: i.toString(), name: c.trim(), max_score: 10 }));
    await supabase.from('qa_scorecard_templates').insert({ organization_id: currentOrganization!.id, name: name.trim(), criteria: criteriaList, is_active: true });
    setName(''); setCriteria(''); setShowCreate(false); loadScorecards();
  };

  const avgScore = scores.length > 0 ? scores.reduce((sum, s) => sum + (s.total_score / s.max_score * 100), 0) / scores.length : 0;

  return (
    <ThemedView variant="default" style={styles.container}>
      <ThemedHeader title="QA Scorecards" showBack rightAction={
        <TouchableOpacity onPress={() => setShowCreate(!showCreate)} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
          <Icon name={icons.add} size={18} color="#FFF" />
        </TouchableOpacity>
      } />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.statsRow, { backgroundColor: colors.surfaceAlt }]}>
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: colors.primary }]}>{scorecards.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Templates</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: colors.success }]}>{scores.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Scored</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: colors.warning }]}>{avgScore.toFixed(0)}%</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Avg Score</Text>
          </View>
        </View>

        {showCreate && (
          <View style={[styles.createCard, { backgroundColor: colors.surfaceAlt }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>New Scorecard</Text>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Name</Text>
            <TextInput style={[styles.input, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]} placeholder="Scorecard name" placeholderTextColor={colors.textMuted} value={name} onChangeText={setName} />
            <Text style={[styles.label, { color: colors.textSecondary }]}>Criteria (one per line)</Text>
            <TextInput style={[styles.input, styles.textArea, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]} placeholder={"Greeting\nEmpathy\nResolution\nCompliance\nClosing"} placeholderTextColor={colors.textMuted} value={criteria} onChangeText={setCriteria} multiline numberOfLines={5} />
            <View style={styles.createActions}>
              <TouchableOpacity onPress={() => setShowCreate(false)} style={[styles.cancelBtn, { borderColor: colors.border }]}><Text style={{ color: colors.text }}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={createScorecard} style={[styles.saveBtn, { backgroundColor: colors.primary }]}><Text style={{ color: '#FFF', fontWeight: '600' }}>Create</Text></TouchableOpacity>
            </View>
          </View>
        )}

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Templates</Text>
        {scorecards.map(sc => (
          <View key={sc.id} style={[styles.card, { backgroundColor: colors.surfaceAlt }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{sc.name}</Text>
            <Text style={[styles.cardMeta, { color: colors.textMuted }]}>{sc.criteria?.length || 0} criteria</Text>
          </View>
        ))}

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Scores</Text>
        {scores.length === 0 ? (
          <View style={styles.empty}>
            <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>No scores yet</Text>
          </View>
        ) : scores.map(s => (
          <View key={s.id} style={[styles.card, { backgroundColor: colors.surfaceAlt }]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardInfo}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>{s.calls?.contacts?.name || 'Unknown Call'}</Text>
                <Text style={[styles.cardMeta, { color: colors.textMuted }]}>Scored by {s.user_profiles?.full_name || 'System'}</Text>
              </View>
              <Text style={[styles.scoreText, { color: s.total_score / s.max_score >= 0.8 ? colors.success : s.total_score / s.max_score >= 0.6 ? colors.warning : colors.error }]}>
                {((s.total_score / s.max_score) * 100).toFixed(0)}%
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

import { Text } from 'react-native';
const styles = StyleSheet.create({
  container: { flex: 1 }, content: { padding: 16, paddingBottom: 24 },
  addBtn: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  statsRow: { flexDirection: 'row', padding: 16, borderRadius: 16, marginBottom: 16 },
  stat: { flex: 1, alignItems: 'center', gap: 4 },
  statNum: { fontSize: 24, fontWeight: '700' },
  statLabel: { fontSize: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12, marginTop: 8 },
  createCard: { padding: 16, borderRadius: 16, marginBottom: 16, gap: 12 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  createActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1 },
  saveBtn: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center' },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyDesc: { fontSize: 14 },
  card: { padding: 14, borderRadius: 12, marginBottom: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardInfo: { flex: 1, gap: 2 },
  cardMeta: { fontSize: 12 },
  scoreText: { fontSize: 20, fontWeight: '700' },
});
