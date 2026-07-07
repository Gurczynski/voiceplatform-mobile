// IVR Flow Builder - Visual call flow editor
import { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, TextInput, Alert, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { useThemeContext } from '../../../src/theme/ThemeProvider';
import { useAuthStore } from '../../../src/stores';
import { supabase } from '../../../src/lib/supabase';
import { ThemedView, ThemedText, ThemedHeader, ThemedInput, Icon, icons } from '../../../src/components/ui';

const NODE_TYPES = [
  { type: 'incoming_call', label: 'Incoming Call', icon: icons.call, color: '#3B82F6' },
  { type: 'play_greeting', label: 'Play Greeting', icon: icons.speaker, color: '#8B5CF6' },
  { type: 'gather_input', label: 'Gather Input', icon: icons.dialpad, color: '#EC4899' },
  { type: 'route_user', label: 'Route to User', icon: icons.person, color: '#10B981' },
  { type: 'route_team', label: 'Route to Team', icon: icons.people, color: '#10B981' },
  { type: 'forward_external', label: 'Forward Call', icon: icons.call, color: '#F59E0B' },
  { type: 'business_hours', label: 'Business Hours', icon: icons.clock, color: '#6366F1' },
  { type: 'ai_receptionist', label: 'AI Receptionist', icon: icons.mic, color: '#EC4899' },
  { type: 'voicemail', label: 'Voicemail', icon: icons.mail, color: '#EF4444' },
  { type: 'send_sms', label: 'Send SMS', icon: icons.chat, color: '#3B82F6' },
  { type: 'hangup', label: 'Hang Up', icon: icons.close, color: '#EF4444' },
];

export default function IvrBuilderScreen() {
  const { theme } = useThemeContext();
  const { colors } = theme;
  const { currentOrganization } = useAuthStore();
  const [flows, setFlows] = useState<any[]>([]);
  const [selectedFlow, setSelectedFlow] = useState<any>(null);
  const [nodes, setNodes] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [flowName, setFlowName] = useState('');
  const [showNodePicker, setShowNodePicker] = useState(false);

  useEffect(() => {
    if (currentOrganization?.id) loadFlows();
  }, [currentOrganization?.id]);

  const loadFlows = async () => {
    if (!currentOrganization?.id) return;
    const { data } = await supabase.from('ivr_flows').select('*').eq('organization_id', currentOrganization.id).order('created_at', { ascending: false });
    setFlows(data || []);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadFlows();
    setRefreshing(false);
  }, []);

  const createFlow = async () => {
    if (!currentOrganization?.id || !flowName.trim()) return;
    const { data, error } = await supabase.from('ivr_flows').insert({
      organization_id: currentOrganization.id,
      name: flowName.trim(),
      status: 'draft',
      flow_data: { nodes: [{ id: '1', type: 'incoming_call', label: 'Incoming Call', config: {}, position_x: 50, position_y: 50 }], edges: [] },
    }).select().single();

    if (!error && data) {
      setFlows(prev => [data, ...prev]);
      setSelectedFlow(data);
      setNodes(data.flow_data?.nodes || []);
      setEditing(true);
      setFlowName('');
    }
  };

  const addNode = (type: string) => {
    const nodeType = NODE_TYPES.find(n => n.type === type);
    if (!nodeType) return;
    const newNode = {
      id: Date.now().toString(),
      type,
      label: nodeType.label,
      config: {},
      position_x: 50,
      position_y: (nodes.length * 80) + 50,
    };
    setNodes(prev => [...prev, newNode]);
    setShowNodePicker(false);
  };

  const removeNode = (nodeId: string) => {
    setNodes(prev => prev.filter(n => n.id !== nodeId));
  };

  const saveFlow = async () => {
    if (!selectedFlow) return;
    await supabase.from('ivr_flows').update({
      flow_data: { nodes, edges: [] },
      version: (selectedFlow.version || 1) + 1,
    }).eq('id', selectedFlow.id);
    Alert.alert('Saved', 'IVR flow saved successfully');
  };

  const publishFlow = async () => {
    if (!selectedFlow) return;
    await supabase.from('ivr_flows').update({
      status: 'published',
      flow_data: { nodes, edges: [] },
    }).eq('id', selectedFlow.id);
    Alert.alert('Published', 'IVR flow is now active');
    await loadFlows();
  };

  return (
    <ThemedView variant="default" style={styles.container}>
      <ThemedHeader title="IVR Builder" showBack />

      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
        {!editing ? (
          <>
            <View style={[styles.createCard, { backgroundColor: colors.surfaceAlt }]}>
              <ThemedText variant="subtitle">Create New Flow</ThemedText>
              <View style={styles.createRow}>
                <TextInput
                  style={[styles.nameInput, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
                  placeholder="Flow name..." placeholderTextColor={colors.textMuted}
                  value={flowName} onChangeText={setFlowName}
                />
                <TouchableOpacity onPress={createFlow} style={[styles.createBtn, { backgroundColor: colors.primary }]}>
                  <Icon name={icons.add} size={20} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>

            <ThemedText variant="subtitle" style={styles.sectionTitle}>Your Flows</ThemedText>
            {flows.length === 0 ? (
              <View style={styles.emptyState}>
                <Icon name={icons.dialpad} size={48} color={colors.textMuted} />
                <ThemedText variant="subtitle">No IVR flows</ThemedText>
                <ThemedText variant="muted">Create your first call flow</ThemedText>
              </View>
            ) : flows.map(flow => (
              <TouchableOpacity
                key={flow.id}
                style={[styles.flowCard, { backgroundColor: colors.surfaceAlt }]}
                onPress={() => { setSelectedFlow(flow); setNodes(flow.flow_data?.nodes || []); setEditing(true); }}
              >
                <View style={styles.flowInfo}>
                  <ThemedText variant="body" weight="600">{flow.name}</ThemedText>
                  <ThemedText variant="caption">{flow.flow_data?.nodes?.length || 0} nodes • v{flow.version || 1}</ThemedText>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: flow.status === 'published' ? colors.success + '20' : colors.warning + '20' }]}>
                  <ThemedText variant="caption" style={{ color: flow.status === 'published' ? colors.success : colors.warning }}>{flow.status}</ThemedText>
                </View>
              </TouchableOpacity>
            ))}
          </>
        ) : (
          <>
            <View style={styles.editorHeader}>
              <TouchableOpacity onPress={() => { setEditing(false); setSelectedFlow(null); }}>
                <Icon name={icons.back} size={24} color={colors.primary} />
              </TouchableOpacity>
              <ThemedText variant="subtitle" style={{ flex: 1 }}>{selectedFlow?.name}</ThemedText>
              <TouchableOpacity onPress={saveFlow} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
                <ThemedText variant="caption" style={{ color: '#FFF' }}>Save</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity onPress={publishFlow} style={[styles.saveBtn, { backgroundColor: colors.success }]}>
                <ThemedText variant="caption" style={{ color: '#FFF' }}>Publish</ThemedText>
              </TouchableOpacity>
            </View>

            <View style={[styles.canvas, { backgroundColor: colors.surfaceAlt }]}>
              <ThemedText variant="caption" style={{ color: colors.textMuted, marginBottom: 12 }}>Call Flow</ThemedText>
              {nodes.map((node, idx) => {
                const nodeType = NODE_TYPES.find(n => n.type === node.type);
                return (
                  <View key={node.id} style={[styles.nodeCard, { backgroundColor: colors.surface, borderLeftColor: nodeType?.color || colors.primary }]}>
                    <View style={styles.nodeHeader}>
                      <Icon name={nodeType?.icon || icons.call} size={20} color={nodeType?.color || colors.primary} />
                      <ThemedText variant="body" weight="600" style={{ flex: 1 }}>{node.label}</ThemedText>
                      {idx > 0 && (
                        <TouchableOpacity onPress={() => removeNode(node.id)}>
                          <Icon name={icons.close} size={18} color={colors.error} />
                        </TouchableOpacity>
                      )}
                    </View>
                    {idx < nodes.length - 1 && (
                      <View style={styles.connector}>
                        <View style={[styles.connectorLine, { backgroundColor: colors.border }]} />
                        <Icon name={icons.forward} size={16} color={colors.textMuted} />
                        <View style={[styles.connectorLine, { backgroundColor: colors.border }]} />
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            <TouchableOpacity
              style={[styles.addNodeBtn, { backgroundColor: colors.surfaceAlt }]}
              onPress={() => setShowNodePicker(!showNodePicker)}
            >
              <Icon name={icons.add} size={20} color={colors.primary} />
              <ThemedText variant="body" style={{ color: colors.primary }}>Add Node</ThemedText>
            </TouchableOpacity>

            {showNodePicker && (
              <View style={[styles.nodePicker, { backgroundColor: colors.surface }]}>
                <ThemedText variant="subtitle" style={{ marginBottom: 12 }}>Select Block</ThemedText>
                {NODE_TYPES.slice(1).map(nodeType => (
                  <TouchableOpacity
                    key={nodeType.type}
                    style={[styles.nodeOption, { backgroundColor: colors.surfaceAlt }]}
                    onPress={() => addNode(nodeType.type)}
                  >
                    <Icon name={nodeType.icon} size={20} color={nodeType.color} />
                    <ThemedText variant="body">{nodeType.label}</ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 24 },
  sectionTitle: { marginBottom: 12 },
  createCard: { padding: 16, borderRadius: 12, marginBottom: 24, gap: 12 },
  createRow: { flexDirection: 'row', gap: 8 },
  nameInput: { flex: 1, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  createBtn: { width: 44, height: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  flowCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 8, gap: 12 },
  flowInfo: { flex: 1, gap: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  editorHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  saveBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  canvas: { padding: 16, borderRadius: 12, minHeight: 200, marginBottom: 16 },
  nodeCard: { borderLeftWidth: 4, borderRadius: 8, padding: 12, marginBottom: 4 },
  nodeHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  connector: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, gap: 4 },
  connectorLine: { flex: 1, height: 1 },
  addNodeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: '#3B82F6' },
  nodePicker: { padding: 16, borderRadius: 12, marginTop: 12 },
  nodeOption: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 8, marginBottom: 8 },
});
