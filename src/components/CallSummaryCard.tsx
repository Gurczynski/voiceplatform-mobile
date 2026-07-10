// AI Call Summary Card - Shows after call ends
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useThemeContext } from '../../src/theme/ThemeProvider';
import { Icon, icons } from './ui';

interface CallSummaryProps {
  call: {
    id: string;
    ai_summary?: string;
    ai_sentiment?: string;
    ai_action_items?: string[];
    duration_seconds: number;
    contacts?: { name?: string };
    from_number: string;
    to_number: string;
  };
  onActionItemPress?: (item: string) => void;
}

export function CallSummaryCard({ call, onActionItemPress }: CallSummaryProps) {
  const { theme } = useThemeContext();
  const { colors } = theme;

  const getSentimentEmoji = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive': return '😊';
      case 'negative': return '😞';
      default: return '😐';
    }
  };

  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive': return colors.success;
      case 'negative': return colors.error;
      default: return colors.textMuted;
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.surfaceAlt }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.title, { color: colors.text }]}>Call Summary</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {call.contacts?.name || call.from_number} • {formatDuration(call.duration_seconds)}
          </Text>
        </View>
        <Text style={styles.sentimentEmoji}>{getSentimentEmoji(call.ai_sentiment)}</Text>
      </View>

      {call.ai_summary && (
        <View style={[styles.summaryBox, { backgroundColor: colors.surface }]}>
          <Text style={[styles.summaryText, { color: colors.text }]}>{call.ai_summary}</Text>
        </View>
      )}

      {call.ai_sentiment && (
        <View style={styles.sentimentRow}>
          <Text style={[styles.sentimentLabel, { color: colors.textMuted }]}>Sentiment:</Text>
          <Text style={[styles.sentimentValue, { color: getSentimentColor(call.ai_sentiment) }]}>
            {call.ai_sentiment.charAt(0).toUpperCase() + call.ai_sentiment.slice(1)}
          </Text>
        </View>
      )}

      {call.ai_action_items && call.ai_action_items.length > 0 && (
        <View style={styles.actionsSection}>
          <Text style={[styles.actionsTitle, { color: colors.text }]}>Action Items</Text>
          {call.ai_action_items.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.actionItem}
              onPress={() => onActionItemPress?.(item)}
            >
              <Icon name={icons.check} size={16} color={colors.primary} />
              <Text style={[styles.actionText, { color: colors.text }]}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderRadius: 16, gap: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerLeft: { flex: 1, gap: 4 },
  title: { fontSize: 16, fontWeight: '700' },
  subtitle: { fontSize: 13 },
  sentimentEmoji: { fontSize: 28 },
  summaryBox: { padding: 12, borderRadius: 10 },
  summaryText: { fontSize: 14, lineHeight: 20 },
  sentimentRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sentimentLabel: { fontSize: 13 },
  sentimentValue: { fontSize: 13, fontWeight: '600' },
  actionsSection: { gap: 8 },
  actionsTitle: { fontSize: 14, fontWeight: '600' },
  actionItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  actionText: { fontSize: 14, flex: 1 },
});
