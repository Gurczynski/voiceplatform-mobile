// Industry Templates - Pre-built configurations for different industries
import { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Text, Alert } from 'react-native';
import { useThemeContext } from '../../src/theme/ThemeProvider';
import { ThemedView, ThemedText, ThemedHeader, Icon, icons } from '../../src/components/ui';

const INDUSTRIES = [
  {
    id: 'hvac',
    name: 'HVAC',
    icon: '🔧',
    color: '#3B82F6',
    features: ['Emergency dispatch', 'Appointment scheduling', 'Service reminders'],
    ivr: 'Press 1 for emergency, 2 for scheduling, 3 for billing',
    templates: ['Your technician is on the way', 'Service completed, how was your experience?'],
  },
  {
    id: 'dental',
    name: 'Dental',
    icon: '🦷',
    color: '#10B981',
    features: ['Appointment reminders', 'Recall campaigns', 'Insurance verification'],
    ivr: 'Press 1 for appointments, 2 for emergencies, 3 for billing',
    templates: ['Your appointment is tomorrow at 2pm', 'Time for your checkup!'],
  },
  {
    id: 'legal',
    name: 'Law Firm',
    icon: '⚖️',
    color: '#8B5CF6',
    features: ['Client intake', 'Case updates', 'Confidential messaging'],
    ivr: 'Press 1 for new clients, 2 for existing cases, 3 for billing',
    templates: ['Your case has been updated', 'Documents ready for review'],
  },
  {
    id: 'realestate',
    name: 'Real Estate',
    icon: '🏠',
    color: '#F59E0B',
    features: ['Lead capture', 'Showing scheduling', 'Property inquiries'],
    ivr: 'Press 1 for listings, 2 for showings, 3 for agents',
    templates: ['New listing matching your criteria', 'Showing confirmed for tomorrow'],
  },
  {
    id: 'restaurant',
    name: 'Restaurant',
    icon: '🍽️',
    color: '#EF4444',
    features: ['Reservations', 'Order status', 'Catering inquiries'],
    ivr: 'Press 1 for reservations, 2 for takeout, 3 for catering',
    templates: ['Your reservation is confirmed', 'Your order is ready for pickup'],
  },
  {
    id: 'salon',
    name: 'Salon & Spa',
    icon: '💇',
    color: '#EC4899',
    features: ['Booking', 'Reminders', 'Loyalty programs'],
    ivr: 'Press 1 for bookings, 2 for cancellations, 3 for pricing',
    templates: ['Your appointment is confirmed', 'We miss you! Book your next visit'],
  },
  {
    id: 'auto',
    name: 'Auto Repair',
    icon: '🚗',
    color: '#6366F1',
    features: ['Service scheduling', 'Status updates', 'Estimates'],
    ivr: 'Press 1 for service, 2 for status update, 3 for estimates',
    templates: ['Your vehicle is ready for pickup', 'Service estimate attached'],
  },
  {
    id: 'medical',
    name: 'Medical Office',
    icon: '🏥',
    color: '#14B8A6',
    features: ['Appointment scheduling', 'Prescription refills', 'Lab results'],
    ivr: 'Press 1 for appointments, 2 for prescriptions, 3 for results',
    templates: ['Your appointment is confirmed', 'Lab results are available'],
  },
];

export default function IndustryTemplatesScreen() {
  const { theme } = useThemeContext();
  const { colors } = theme;
  const [selected, setSelected] = useState<string | null>(null);

  const handleApply = (industry: typeof INDUSTRIES[0]) => {
    Alert.alert(
      'Apply Template',
      `Apply ${industry.name} template? This will configure IVR, templates, and settings.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Apply', onPress: () => {
          Alert.alert('Applied', `${industry.name} template applied successfully!`);
        }},
      ]
    );
  };

  return (
    <ThemedView variant="default" style={styles.container}>
      <ThemedHeader title="Industry Templates" showBack />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.infoCard, { backgroundColor: colors.surfaceAlt }]}>
          <Text style={[styles.infoTitle, { color: colors.text }]}>Quick Setup</Text>
          <Text style={[styles.infoDesc, { color: colors.textMuted }]}>
            Choose your industry to get pre-configured IVR flows, message templates, and settings.
          </Text>
        </View>

        <View style={styles.grid}>
          {INDUSTRIES.map(industry => (
            <TouchableOpacity
              key={industry.id}
              style={[styles.industryCard, { backgroundColor: colors.surfaceAlt }]}
              onPress={() => setSelected(selected === industry.id ? null : industry.id)}
            >
              <Text style={styles.industryIcon}>{industry.icon}</Text>
              <Text style={[styles.industryName, { color: colors.text }]}>{industry.name}</Text>
              {selected === industry.id && (
                <View style={styles.details}>
                  <Text style={[styles.detailTitle, { color: colors.text }]}>Features:</Text>
                  {industry.features.map((f, i) => (
                    <Text key={i} style={[styles.detailText, { color: colors.textSecondary }]}>• {f}</Text>
                  ))}
                  <Text style={[styles.detailTitle, { color: colors.text, marginTop: 8 }]}>IVR:</Text>
                  <Text style={[styles.detailText, { color: colors.textSecondary }]}>{industry.ivr}</Text>
                  <TouchableOpacity
                    onPress={() => handleApply(industry)}
                    style={[styles.applyBtn, { backgroundColor: industry.color }]}
                  >
                    <Text style={{ color: '#FFF', fontWeight: '600' }}>Apply Template</Text>
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 24 },
  infoCard: { padding: 16, borderRadius: 12, marginBottom: 20 },
  infoTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  infoDesc: { fontSize: 14 },
  grid: { gap: 12 },
  industryCard: { padding: 16, borderRadius: 12 },
  industryIcon: { fontSize: 32, marginBottom: 8 },
  industryName: { fontSize: 16, fontWeight: '600' },
  details: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  detailTitle: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  detailText: { fontSize: 13, marginBottom: 2 },
  applyBtn: { padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 12 },
});
