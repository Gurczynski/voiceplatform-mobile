import { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Vibration, Platform } from 'react-native';
import { router } from 'expo-router';
import { useThemeContext } from '../src/theme/ThemeProvider';
import { ThemedView, ThemedText, ThemedHeader, Icon, icons } from '../src/components/ui';

const KEYS = [
  [{ key: '1', sub: '' }, { key: '2', sub: 'ABC' }, { key: '3', sub: 'DEF' }],
  [{ key: '4', sub: 'GHI' }, { key: '5', sub: 'JKL' }, { key: '6', sub: 'MNO' }],
  [{ key: '7', sub: 'PQRS' }, { key: '8', sub: 'TUV' }, { key: '9', sub: 'WXYZ' }],
  [{ key: '*', sub: '' }, { key: '0', sub: '+' }, { key: '#', sub: '' }],
];

export default function DialPadScreen() {
  const { theme } = useThemeContext();
  const { colors } = theme;
  const [number, setNumber] = useState('');

  const handlePress = (key: string) => {
    if (Platform.OS !== 'web') Vibration.vibrate(10);
    setNumber(prev => prev + key);
  };

  const formatNumber = (n: string) => {
    if (n.length <= 3) return n;
    if (n.length <= 6) return `(${n.slice(0, 3)}) ${n.slice(3)}`;
    return `(${n.slice(0, 3)}) ${n.slice(3, 6)}-${n.slice(6, 10)}`;
  };

  return (
    <ThemedView variant="default" style={styles.container}>
      <ThemedHeader title="Dial Pad" showBack />

      <View style={styles.content}>
        <View style={styles.display}>
          <ThemedText variant="display" align="center" numberOfLines={1} adjustsFontSizeToFit>
            {number ? formatNumber(number) : ' '}
          </ThemedText>
          {!number && <ThemedText variant="muted" align="center">Enter a phone number</ThemedText>}
        </View>

        <View style={styles.keypad}>
          {KEYS.map((row, i) => (
            <View key={i} style={styles.keyRow}>
              {row.map(item => (
                <TouchableOpacity key={item.key} onPress={() => handlePress(item.key)} style={[styles.keyBtn, { backgroundColor: colors.surfaceAlt }]} activeOpacity={0.6}>
                  <ThemedText variant="title" style={{ color: colors.text }}>{item.key}</ThemedText>
                  {item.sub ? <ThemedText variant="caption" style={{ color: colors.textMuted, marginTop: -2 }}>{item.sub}</ThemedText> : null}
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            onPress={() => number.length > 0 && router.push({ pathname: '/call/active', params: { number: `+1${number}`, direction: 'outbound' } })}
            style={[styles.callBtn, { backgroundColor: number.length > 0 ? colors.success : colors.surfaceAlt }]}
            disabled={number.length === 0}
          >
            <Icon name={icons.call} size={32} color={number.length > 0 ? '#FFF' : colors.textMuted} />
          </TouchableOpacity>
          {number.length > 0 && (
            <TouchableOpacity onPress={() => setNumber(prev => prev.slice(0, -1))} style={styles.delBtn}>
              <Icon name={icons.back} size={28} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.shortcuts}>
          {[{ icon: icons.people, label: 'Contacts' }, { icon: icons.star, label: 'Favorites' }, { icon: icons.clock, label: 'Recents' }].map(s => (
            <TouchableOpacity key={s.label} style={[styles.shortcut, { backgroundColor: colors.surfaceAlt }]}>
              <Icon name={s.icon} size={22} color={colors.icon} />
              <ThemedText variant="caption">{s.label}</ThemedText>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 24, paddingBottom: 24 },
  display: { paddingVertical: 32, minHeight: 80, justifyContent: 'center' },
  keypad: { gap: 12 },
  keyRow: { flexDirection: 'row', justifyContent: 'center', gap: 16 },
  keyBtn: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 32, paddingVertical: 16 },
  callBtn: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  delBtn: { padding: 16 },
  shortcuts: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 16 },
  shortcut: { alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 16, gap: 4 },
});
