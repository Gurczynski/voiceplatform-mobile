// IVR Builder - Professional Quality
import { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, TextInput, Alert, Switch, Text } from 'react-native';
import { useThemeContext } from '../../../src/theme/ThemeProvider';
import { useAuthStore } from '../../../src/stores';
import { supabase } from '../../../src/lib/supabase';
import { ThemedView, ThemedText, ThemedHeader, Icon, icons } from '../../../src/components/ui';

const NODE_TYPES = [
  { type: 'incoming_call', label: 'Incoming Call', icon: icons.call, color: '#3B82F6', desc: 'Start point for calls' },
  { type: 'play_greeting', label: 'Play Greeting', icon: icons.speaker, color: '#8B5CF6', desc: 'Play audio or text-to-speech' },
  { type: 'gather_input', label: 'Gather Input', icon: icons.dialpad, color: '#EC4899', desc: 'Collect keypad or voice input' },
  { type: 'route_user', label: 'Route to User', icon: icons.person, color: '#10B981', desc: 'Transfer to specific user' },
  { type: 'route_team', label: 'Route to Team', icon: icons.people, color: '#10B981', desc: 'Ring team members' },
  { type: 'forward_external', label: 'Forward External', icon: icons.call, color: '#F59E0B', desc: 'Forward to external number' },
  { type: 'business_hours', label: 'Business Hours', icon: icons.clock, color: '#6366F1', desc: 'Check if within business hours' },
  { type: 'ai_receptionist', label: 'AI Receptionist', icon: icons.mic, color: '#EC4899', desc: 'AI handles the call' },
  { type: 'voicemail', label: 'Voicemail', icon: icons.mail, color: '#EF4444', desc: 'Send to voicemail' },
  { type: 'send_sms', label: 'Send SMS', icon: icons.chat, color: '#3B82F6', desc: 'Send SMS notification' },
  { type: 'hangup', label: 'Hang Up', icon: icons.close, color: '#EF4444', desc: 'End the call' },
];

export default function IvrBuilderScreen() {
  const { theme } = useThemeContext();
  const { colors } = theme;
  const { currentOrganization } = useAuthStore();
  const [flows, setFlows] = useState<any[]>([]);
  const [selectedFlow, setSelectedFlow] = useState<any>(null);
  const [nodes, setNodes] = useState<any[]>([]);
  const [editing, setEditing] = useState(false);
  const [flowName, setFlowName] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [selectedNode, setSelectedNode] = useState<any>(null);

  useEffect(() => { if (currentOrganization?.id) loadFlows(); }, [currentOrganization?.id]);

  const loadFlows = async () => {
    const { data } = await supabase.from('ivr_flows').select('*').eq('organization_id', currentOrganization!.id).order('created_at', { ascending: false });
    setFlows(data || []);
  };

  const createFlow = async () => {
    if (!flowName.trim()) return;
    const { data, error } = await supabase.from('ivr_flows').insert({
      organization_id: currentOrganization!.id, name: flowName.trim(), status: 'draft',
      flow_data: { nodes: [{ id: '1', type: 'incoming_call', label: 'Incoming Call', config: {}, position_x: 50, position_y: 50 }], edges: [] },
    }).select().single();
    if (!error && data) { setFlows(p => [data, ...p]); setSelectedFlow(data); setNodes(data.flow_data?.nodes || []); setEditing(true); setFlowName(''); }
  };

  const addNode = (type: string) => {
    const nt = NODE_TYPES.find(n => n.type === type);
    if (!nt) return;
    setNodes(p => [...p, { id: Date.now().toString(), type, label: nt.label, config: {}, position_x: 50, position_y: (p.length * 80) + 50 }]);
    setShowPicker(false);
  };

  const removeNode = (id: string) => setNodes(p => p.filter(n => n.id !== id));

  const saveFlow = async () => {
    if (!selectedFlow) return;
    await supabase.from('ivr_flows').update({ flow_data: { nodes, edges: [] }, version: (selectedFlow.version || 1) + 1 }).eq('id', selectedFlow.id);
    Alert.alert('Saved', 'IVR flow saved');
  };

  const publishFlow = async () => {
    if (!selectedFlow) return;
    await supabase.from('ivr_flows').update({ status: 'published', flow_data: { nodes, edges: [] } }).eq('id', selectedFlow.id);
    Alert.alert('Published', 'IVR flow is now active');
    loadFlows();
  };

  const deleteFlow = async (id: string) => {
    Alert.alert('Delete', 'Delete this flow?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await supabase.from('ivr_flows').delete().eq('id', id); loadFlows(); } },
    ]);
  };

  return (
    <ThemedView variant="default" style={styles.container}>
      <ThemedHeader title="IVR Builder" showBack />
      <ScrollView contentContainerStyle={styles.content}>
        {!editing ? (
          <>
            <View style={[styles.createCard, { backgroundColor: colors.surfaceAlt }]}>
              <ThemedText variant="subtitle">Create New Flow</ThemedText>
              <ThemedText variant="muted">Design call routing with visual blocks</ThemedText>
              <View style={styles.createRow}>
                <TextInput style={[styles.nameInput, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]} placeholder="Flow name (e.g., Main Menu)" placeholderTextColor={colors.textMuted} value={flowName} onChangeText={setFlowName} />
                <TouchableOpacity onPress={createFlow} style={[styles.createBtn, { backgroundColor: colors.primary }]}>
                  <Icon name={icons.add} size={20} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>

            {flows.length === 0 ? (
              <View style={styles.empty}>
                <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceAlt }]}>
                  <Icon name={icons.dialpad} size={48} color={colors.textMuted} />
                </View>
                <ThemedText variant="subtitle">No IVR flows</ThemedText>
                <ThemedText variant="muted" align="center">Create your first call flow to route incoming calls</ThemedText>
              </View>
            ) : flows.map(flow => (
              <TouchableOpacity key={flow.id} style={[styles.flowCard, { backgroundColor: colors.surfaceAlt }]} onPress={() => { setSelectedFlow(flow); setNodes(flow.flow_data?.nodes || []); setEditing(true); }}>
                <View style={styles.flowHeader}>
                  <View style={[styles.flowIcon, { backgroundColor: flow.status === 'published' ? colors.success + '15' : colors.warning + '15' }]}>
                    <Icon name={icons.dialpad} size={24} color={flow.status === 'published' ? colors.success : colors.warning} />
                  </View>
                  <View style={styles.flowInfo}>
                    <ThemedText variant="body" weight="600">{flow.name}</ThemedText>
                    <ThemedText variant="caption">{flow.flow_data?.nodes?.length || 0} blocks • v{flow.version || 1}</ThemedText>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: flow.status === 'published' ? colors.success + '15' : colors.warning + '15' }]}>
                    <Text style={[styles.statusText, { color: flow.status === 'published' ? colors.success : colors.warning }]}>{flow.status}</Text>
                  </View>
                </View>
                <View style={styles.flowActions}>
                  <TouchableOpacity onPress={() => deleteFlow(flow.id)} style={styles.flowAction}>
                    <Icon name={icons.trash} size={16} color={colors.error} />
                    <Text style={{ color: colors.error, fontSize: 12 }}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </>
        ) : (
          <>
            <View style={styles.editorHeader}>
              <TouchableOpacity onPress={() => { setEditing(false); setSelectedFlow(null); setSelectedNode(null); }}>
                <Icon name={icons.back} size={24} color={colors.primary} />
              </TouchableOpacity>
              <ThemedText variant="subtitle" style={{ flex: 1 }}>{selectedFlow?.name}</ThemedText>
              <TouchableOpacity onPress={saveFlow} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={publishFlow} style={[styles.saveBtn, { backgroundColor: colors.success }]}>
                <Text style={styles.saveBtnText}>Publish</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.canvas, { backgroundColor: colors.surfaceAlt }]}>
              <ThemedText variant="caption" style={{ color: colors.textMuted, marginBottom: 16 }}>Call Flow</ThemedText>
              {nodes.map((node, idx) => {
                const nt = NODE_TYPES.find(n => n.type === node.type);
                const isSelected = selectedNode?.id === node.id;
                return (
                  <View key={node.id}>
                    <TouchableOpacity
                      style={[styles.nodeCard, { backgroundColor: colors.surface, borderLeftColor: nt?.color || colors.primary, borderWidth: isSelected ? 2 : 0, borderColor: isSelected ? colors.primary : 'transparent' }]}
                      onPress={() => setSelectedNode(isSelected ? null : node)}
                    >
                      <View style={styles.nodeHeader}>
                        <View style={[styles.nodeIcon, { backgroundColor: (nt?.color || colors.primary) + '15' }]}>
                          <Icon name={nt?.icon || icons.call} size={20} color={nt?.color || colors.primary} />
                        </View>
                        <View style={styles.nodeInfo}>
                          <ThemedText variant="body" weight="600">{node.label}</ThemedText>
                          <ThemedText variant="caption">{nt?.desc || ''}</ThemedText>
                        </View>
                        {idx > 0 && (
                          <TouchableOpacity onPress={() => removeNode(node.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <Icon name={icons.close} size={18} color={colors.error} />
                          </TouchableOpacity>
                        )}
                      </View>
                    </TouchableOpacity>
                    {idx < nodes.length - 1 && (
                      <View style={styles.connector}>
                        <View style={[styles.connectorLine, { backgroundColor: colors.border }]} />
                        <Icon name={icons.forward} size={14} color={colors.textMuted} />
                        <View style={[styles.connectorLine, { backgroundColor: colors.border }]} />
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            <TouchableOpacity style={[styles.addNodeBtn, { borderColor: colors.primary }]} onPress={() => setShowPicker(!showPicker)}>
              <Icon name={icons.add} size={20} color={colors.primary} />
              <Text style={{ color: colors.primary, fontWeight: '600' }}>Add Block</Text>
            </TouchableOpacity>

            {showPicker && (
              <View style={[styles.picker, { backgroundColor: colors.surface }]}>
                <ThemedText variant="subtitle" style={{ marginBottom: 12 }}>Select Block</ThemedText>
                {NODE_TYPES.slice(1).map(nt => (
                  <TouchableOpacity key={nt.type} style={[styles.pickerItem, { backgroundColor: colors.surfaceAlt }]} onPress={() => addNode(nt.type)}>
                    <View style={[styles.pickerIcon, { backgroundColor: nt.color + '15' }]}>
                      <Icon name={nt.icon} size={20} color={nt.color} />
                    </View>
                    <View style={styles.pickerInfo}>
                      <ThemedText variant="body" weight="600">{nt.label}</ThemedText>
                      <ThemedText variant="caption">{nt.desc}</ThemedText>
                    </View>
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
  container: { flex: 1 }, content: { padding: 16, paddingBottom: 24 },
  createCard: { padding: 16, borderRadius: 16, marginBottom: 24, gap: 8 },
  createRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  nameInput: { flex: 1, borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16 },
  createBtn: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyIcon: { width: 80, height: 80, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  flowCard: { padding: 16, borderRadius: 16, marginBottom: 12 },
  flowHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flowIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  flowInfo: { flex: 1, gap: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  flowActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12, gap: 16 },
  flowAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editorHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  saveBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  saveBtnText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  canvas: { padding: 16, borderRadius: 16, minHeight: 200, marginBottom: 16 },
  nodeCard: { borderRadius: 12, padding: 14, marginBottom: 4 },
  nodeHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  nodeIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  nodeInfo: { flex: 1, gap: 2 },
  connector: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, gap: 4, paddingHorizontal: 20 },
  connectorLine: { flex: 1, height: 1 },
  addNodeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed' },
  picker: { padding: 16, borderRadius: 16, marginTop: 12 },
  pickerItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, marginBottom: 8 },
  pickerIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  pickerInfo: { flex: 1, gap: 2 },
});
