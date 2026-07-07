import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Vibration } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeContext } from '../../src/theme/ThemeProvider';
import { ThemedView, ThemedText, Icon, icons } from '../../src/components/ui';

export default function ActiveCallScreen() {
  const { theme } = useThemeContext();
  const { colors, borderRadius } = theme;
  const params = useLocalSearchParams<{ number?: string; name?: string; direction?: string }>();
  const insets = useSafeAreaInsets();

  const [callStatus, setCallStatus] = useState<'connecting' | 'ringing' | 'active' | 'ended'>('connecting');
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [isHold, setIsHold] = useState(false);

  useEffect(() => {
    // Simulate call progression
    const timer1 = setTimeout(() => setCallStatus('ringing'), 1000);
    const timer2 = setTimeout(() => setCallStatus('active'), 3000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  useEffect(() => {
    if (callStatus !== 'active') return;

    const interval = setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [callStatus]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndCall = () => {
    Vibration.vibrate(100);
    setCallStatus('ended');
    setTimeout(() => router.back(), 1000);
  };

  const toggleMute = () => {
    Vibration.vibrate(10);
    setIsMuted(!isMuted);
  };

  const toggleSpeaker = () => {
    Vibration.vibrate(10);
    setIsSpeaker(!isSpeaker);
  };

  const toggleHold = () => {
    Vibration.vibrate(10);
    setIsHold(!isHold);
  };

  const getStatusText = () => {
    switch (callStatus) {
      case 'connecting': return 'Connecting...';
      case 'ringing': return 'Ringing...';
      case 'active': return formatDuration(duration);
      case 'ended': return 'Call Ended';
    }
  };

  const getStatusColor = () => {
    switch (callStatus) {
      case 'connecting': return colors.textMuted;
      case 'ringing': return colors.warning;
      case 'active': return colors.success;
      case 'ended': return colors.error;
    }
  };

  return (
    <ThemedView variant="default" style={[styles.container, { paddingTop: insets.top }]}>
      {/* Call Info */}
      <View style={styles.callInfo}>
        <View style={[styles.avatar, { backgroundColor: colors.surfaceAlt }]}>
          <Icon name={icons.person} size={48} color={colors.primary} />
        </View>
        <ThemedText variant="title" align="center">
          {params.name || params.number || 'Unknown'}
        </ThemedText>
        {params.name && params.number && (
          <ThemedText variant="muted" align="center">{params.number}</ThemedText>
        )}
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
          <ThemedText variant="subtitle" style={{ color: getStatusColor() }}>
            {getStatusText()}
          </ThemedText>
        </View>
        {params.direction === 'outbound' && (
          <ThemedText variant="caption" align="center">Outgoing Call</ThemedText>
        )}
      </View>

      {/* Call Controls */}
      <View style={styles.controls}>
        <View style={styles.controlRow}>
          <TouchableOpacity
            style={[styles.controlButton, { backgroundColor: isMuted ? colors.primary : colors.surfaceAlt }]}
            onPress={toggleMute}
          >
            <Icon name={isMuted ? icons.micOff : icons.mic} size={24} color={isMuted ? '#FFFFFF' : colors.icon} />
            <ThemedText variant="caption" style={{ color: isMuted ? '#FFFFFF' : colors.text }}>
              {isMuted ? 'Unmute' : 'Mute'}
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, { backgroundColor: isSpeaker ? colors.primary : colors.surfaceAlt }]}
            onPress={toggleSpeaker}
          >
            <Icon name={isSpeaker ? icons.speaker : icons.speakerOff} size={24} color={isSpeaker ? '#FFFFFF' : colors.icon} />
            <ThemedText variant="caption" style={{ color: isSpeaker ? '#FFFFFF' : colors.text }}>
              Speaker
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, { backgroundColor: isHold ? colors.warning : colors.surfaceAlt }]}
            onPress={toggleHold}
          >
            <Icon name={icons.pause} size={24} color={isHold ? '#FFFFFF' : colors.icon} />
            <ThemedText variant="caption" style={{ color: isHold ? '#FFFFFF' : colors.text }}>
              Hold
            </ThemedText>
          </TouchableOpacity>
        </View>

        <View style={styles.controlRow}>
          <TouchableOpacity style={[styles.controlButton, { backgroundColor: colors.surfaceAlt }]}>
            <Icon name={icons.dialpad} size={24} color={colors.icon} />
            <ThemedText variant="caption">Keypad</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.controlButton, { backgroundColor: colors.surfaceAlt }]}>
            <Icon name={icons.add} size={24} color={colors.icon} />
            <ThemedText variant="caption">Add Call</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.controlButton, { backgroundColor: colors.surfaceAlt }]}>
            <Icon name={icons.chat} size={24} color={colors.icon} />
            <ThemedText variant="caption">Message</ThemedText>
          </TouchableOpacity>
        </View>

        {/* End Call Button */}
        <TouchableOpacity
          style={[styles.endCallButton, { backgroundColor: colors.error }]}
          onPress={handleEndCall}
        >
          <Icon name={icons.call} size={32} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between', padding: 24, paddingBottom: 48 },
  callInfo: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  avatar: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  controls: { gap: 24 },
  controlRow: { flexDirection: 'row', justifyContent: 'space-around' },
  controlButton: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', gap: 4 },
  endCallButton: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginTop: 16 },
});
