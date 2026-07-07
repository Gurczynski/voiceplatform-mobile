// Active Call Screen - Real calls via Edge Functions
import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Vibration } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeContext } from '../../src/theme/ThemeProvider';
import { useAuthStore } from '../../src/stores';
import { twilioVoice, CallEvent } from '../../src/lib/twilio';
import { ThemedView, ThemedText, Icon, icons } from '../../src/components/ui';

export default function ActiveCallScreen() {
  const { theme } = useThemeContext();
  const { colors } = theme;
  const params = useLocalSearchParams<{ number?: string; name?: string; direction?: string }>();
  const insets = useSafeAreaInsets();
  const { currentOrganization } = useAuthStore();

  const [status, setStatus] = useState<'connecting' | 'ringing' | 'active' | 'ended'>('connecting');
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(false);
  const [hold, setHold] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initCall = async () => {
      if (!currentOrganization?.id || !params.number) return;

      if (params.direction === 'outbound') {
        const result = await twilioVoice.makeCall({
          to: params.number,
          organizationId: currentOrganization.id,
        });

        if (result.success) {
          setStatus('ringing');
          // Simulate call connecting after 3 seconds for demo
          setTimeout(() => setStatus('active'), 3000);
        } else {
          setError(result.error || 'Failed to connect');
          setStatus('ended');
        }
      } else {
        // Inbound call - already ringing
        setStatus('ringing');
        setTimeout(() => setStatus('active'), 2000);
      }
    };

    initCall();

    // Listen for call events
    const unsubscribe = twilioVoice.onEvent((event: CallEvent) => {
      switch (event.type) {
        case 'ringing': setStatus('ringing'); break;
        case 'connected': setStatus('active'); break;
        case 'disconnected': setStatus('ended'); break;
        case 'error': setError(event.error || 'Call failed'); setStatus('ended'); break;
      }
    });

    return unsubscribe;
  }, [currentOrganization?.id, params.number, params.direction]);

  // Duration timer
  useEffect(() => {
    if (status !== 'active') return;
    const iv = setInterval(() => setDuration(d => d + 1), 1000);
    return () => clearInterval(iv);
  }, [status]);

  // Auto-close after ended
  useEffect(() => {
    if (status === 'ended') {
      const timer = setTimeout(() => router.back(), 2000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const formatDur = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const endCall = useCallback(async () => {
    Vibration.vibrate(100);
    await twilioVoice.endCall();
    setStatus('ended');
  }, []);

  const toggleMute = useCallback(() => {
    Vibration.vibrate(10);
    setMuted(!muted);
  }, [muted]);

  const toggleSpeaker = useCallback(() => {
    Vibration.vibrate(10);
    setSpeaker(!speaker);
  }, [speaker]);

  const toggleHold = useCallback(() => {
    Vibration.vibrate(10);
    setHold(!hold);
  }, [hold]);

  const statusColor = status === 'active' ? colors.success : status === 'ringing' ? colors.warning : status === 'ended' ? colors.error : colors.textMuted;
  const statusText = status === 'connecting' ? 'Connecting...' : status === 'ringing' ? 'Ringing...' : status === 'active' ? formatDur(duration) : error || 'Call Ended';

  const ControlBtn = ({ icon, label, active, onPress, color }: any) => (
    <TouchableOpacity style={[styles.ctrlBtn, { backgroundColor: active ? (color || colors.primary) : colors.surfaceAlt }]} onPress={onPress}>
      <Icon name={icon} size={24} color={active ? '#FFF' : colors.icon} />
      <ThemedText variant="caption" style={{ color: active ? '#FFF' : colors.text, marginTop: 4 }}>{label}</ThemedText>
    </TouchableOpacity>
  );

  return (
    <ThemedView variant="default" style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.info}>
        <View style={[styles.avatar, { backgroundColor: colors.surfaceAlt }]}>
          <Icon name={icons.person} size={48} color={colors.primary} />
        </View>
        <ThemedText variant="title" align="center">{params.name || params.number || 'Unknown'}</ThemedText>
        {params.name && params.number && <ThemedText variant="muted" align="center">{params.number}</ThemedText>}
        <View style={styles.statusRow}>
          <View style={[styles.dot, { backgroundColor: statusColor }]} />
          <ThemedText variant="subtitle" style={{ color: statusColor }}>{statusText}</ThemedText>
        </View>
      </View>

      <View style={styles.controls}>
        <View style={styles.ctrlRow}>
          <ControlBtn icon={muted ? icons.micOff : icons.mic} label={muted ? 'Unmute' : 'Mute'} active={muted} onPress={toggleMute} />
          <ControlBtn icon={speaker ? icons.speaker : icons.speakerOff} label="Speaker" active={speaker} onPress={toggleSpeaker} />
          <ControlBtn icon={icons.pause} label="Hold" active={hold} color={colors.warning} onPress={toggleHold} />
        </View>
        <View style={styles.ctrlRow}>
          <ControlBtn icon={icons.dialpad} label="Keypad" active={false} onPress={() => {}} />
          <ControlBtn icon={icons.add} label="Add" active={false} onPress={() => {}} />
          <ControlBtn icon={icons.chat} label="Message" active={false} onPress={() => router.push('/(tabs)/messages')} />
        </View>
        <TouchableOpacity style={[styles.endBtn, { backgroundColor: colors.error }]} onPress={endCall}>
          <Icon name={icons.call} size={32} color="#FFF" />
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between', padding: 24, paddingBottom: 48 },
  info: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  avatar: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  controls: { gap: 24 },
  ctrlRow: { flexDirection: 'row', justifyContent: 'space-around' },
  ctrlBtn: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  endBtn: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginTop: 16 },
});
