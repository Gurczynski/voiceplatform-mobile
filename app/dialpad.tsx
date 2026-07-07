import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Vibration, Platform } from 'react-native';
import { router } from 'expo-router';
import { useThemeContext } from '../src/theme/ThemeProvider';
import { ThemedView, ThemedText, ThemedHeader, Icon, icons } from '../src/components/ui';

const DIAL_KEYS = [
  [{ key: '1', sub: '' }, { key: '2', sub: 'ABC' }, { key: '3', sub: 'DEF' }],
  [{ key: '4', sub: 'GHI' }, { key: '5', sub: 'JKL' }, { key: '6', sub: 'MNO' }],
  [{ key: '7', sub: 'PQRS' }, { key: '8', sub: 'TUV' }, { key: '9', sub: 'WXYZ' }],
  [{ key: '*', sub: '' }, { key: '0', sub: '+' }, { key: '#', sub: '' }],
];

export default function DialPadScreen() {
  const { theme } = useThemeContext();
  const { colors, spacing, fontSize, borderRadius } = theme;
  const [number, setNumber] = useState('');

  const handlePress = (key: string) => {
    if (Platform.OS !== 'web') {
      Vibration.vibrate(10);
    }
    setNumber((prev) => prev + key);
  };

  const handleBackspace = () => {
    setNumber((prev) => prev.slice(0, -1));
  };

  const handleCall = () => {
    if (number.length > 0) {
      alert(`Calling ${formatPhoneNumber(number)}...`);
    }
  };

  const formatPhoneNumber = (num: string) => {
    if (num.length <= 3) return num;
    if (num.length <= 6) return `(${num.slice(0, 3)}) ${num.slice(3)}`;
    return `(${num.slice(0, 3)}) ${num.slice(3, 6)}-${num.slice(6, 10)}`;
  };

  return (
    <ThemedView variant="default" style={styles.container}>
      <ThemedHeader title="Dial Pad" showBack />

      <View style={styles.content}>
        <View style={styles.numberDisplay}>
          <ThemedText variant="display" align="center" numberOfLines={1} adjustsFontSizeToFit>
            {number ? formatPhoneNumber(number) : ' '}
          </ThemedText>
          {number.length === 0 && (
            <ThemedText variant="muted" align="center">Enter a phone number</ThemedText>
          )}
        </View>

        <View style={styles.keypad}>
          {DIAL_KEYS.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.keyRow}>
              {row.map((item) => (
                <TouchableOpacity
                  key={item.key}
                  onPress={() => handlePress(item.key)}
                  style={[styles.keyButton, { backgroundColor: colors.surfaceAlt }]}
                  activeOpacity={0.6}
                >
                  <Text style={[styles.keyText, { color: colors.text }]}>{item.key}</Text>
                  {item.sub ? <Text style={[styles.keySub, { color: colors.textMuted }]}>{item.sub}</Text> : null}
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            onPress={handleCall}
            style={[styles.callButton, { backgroundColor: number.length > 0 ? colors.success : colors.surfaceAlt }]}
            disabled={number.length === 0}
          >
            <Icon name={icons.call} size={32} color={number.length > 0 ? '#FFFFFF' : colors.textMuted} />
          </TouchableOpacity>

          {number.length > 0 && (
            <TouchableOpacity onPress={handleBackspace} style={styles.backspaceButton}>
              <Icon name={icons.back} size={28} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.quickActions}>
          <TouchableOpacity style={[styles.quickAction, { backgroundColor: colors.surfaceAlt }]}>
            <Icon name={icons.people} size={22} color={colors.icon} />
            <ThemedText variant="caption">Contacts</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.quickAction, { backgroundColor: colors.surfaceAlt }]}>
            <Icon name={icons.star} size={22} color={colors.icon} />
            <ThemedText variant="caption">Favorites</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.quickAction, { backgroundColor: colors.surfaceAlt }]}>
            <Icon name={icons.clock} size={22} color={colors.icon} />
            <ThemedText variant="caption">Recents</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 24, paddingBottom: 32 },
  numberDisplay: {
    paddingVertical: 32,
    minHeight: 80,
    justifyContent: 'center',
  },
  keypad: { gap: 12 },
  keyRow: { flexDirection: 'row', justifyContent: 'center', gap: 16 },
  keyButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: { fontSize: 28, fontWeight: '500' },
  keySub: { fontSize: 10, fontWeight: '600', marginTop: -2 },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
    paddingVertical: 16,
  },
  callButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backspaceButton: { padding: 16 },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
  },
  quickAction: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    gap: 4,
  },
});
