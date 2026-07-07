import { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, RefreshControl, StyleSheet, TouchableOpacity, Text, Alert } from 'react-native';
import { useThemeContext } from '../../src/theme/ThemeProvider';
import { useAuthStore } from '../../src/stores';
import { supabase, callEdgeFunction } from '../../src/lib/supabase';
import { ThemedView, ThemedText, ThemedCard, ThemedHeader, ThemedButton, Icon, icons } from '../../src/components/ui';
import type { Subscription, Invoice } from '../../src/types';

const TIERS = [
  { key: 'starter', name: 'Starter', price: '$29', features: ['1 user', '1 number', 'Basic IVR', 'Voicemail'] },
  { key: 'professional', name: 'Professional', price: '$79', features: ['5 users', '5 numbers', 'Advanced IVR', 'AI Summaries', 'Recording'] },
  { key: 'business', name: 'Business', price: '$199', features: ['25 users', '20 numbers', 'AI Receptionist', 'Automation', 'API Access'] },
  { key: 'enterprise', name: 'Enterprise', price: 'Custom', features: ['Unlimited', 'SSO', 'White Label', 'Dedicated Support'] },
];

export default function BillingScreen() {
  const { theme } = useThemeContext();
  const { colors, borderRadius } = theme;
  const { currentOrganization, membership } = useAuthStore();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const canManageBilling = ['owner', 'admin', 'billing_admin'].includes(membership?.role || '');

  const loadBilling = useCallback(async () => {
    if (!currentOrganization) return;

    const [subResult, invResult] = await Promise.all([
      supabase
        .from('subscriptions')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .single(),
      supabase
        .from('invoices')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    setSubscription(subResult.data as Subscription);
    setInvoices((invResult.data || []) as Invoice[]);
    setLoading(false);
  }, [currentOrganization]);

  useEffect(() => {
    loadBilling();
  }, [loadBilling]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadBilling();
    setRefreshing(false);
  }, [loadBilling]);

  const handleCheckout = async (tier: string) => {
    if (!currentOrganization) return;

    const { data, error } = await callEdgeFunction('stripe-checkout', {
      organizationId: currentOrganization.id,
      tier,
      priceId: `price_${tier}`, // Replace with real Stripe price IDs
    });

    if (error) {
      Alert.alert('Error', error);
    } else if (data?.url) {
      // Open Stripe checkout
      Alert.alert('Checkout', 'Stripe checkout would open here. Configure STRIPE_SECRET_KEY to enable.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return colors.success;
      case 'trialing': return colors.primary;
      case 'past_due': return colors.warning;
      case 'canceled': return colors.error;
      default: return colors.textMuted;
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <ThemedView variant="default" style={styles.container}>
      <ThemedHeader title="Billing" showBack />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Current Plan */}
        {subscription && (
          <ThemedCard variant="elevated" padding="lg" style={styles.planCard}>
            <View style={styles.planHeader}>
              <View>
                <ThemedText variant="caption">Current Plan</ThemedText>
                <ThemedText variant="title" style={{ textTransform: 'capitalize' }}>
                  {subscription.tier}
                </ThemedText>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(subscription.status) + '20' }]}>
                <Text style={[styles.statusText, { color: getStatusColor(subscription.status) }]}>
                  {subscription.status}
                </Text>
              </View>
            </View>

            <View style={styles.planDetails}>
              <View style={styles.planDetail}>
                <ThemedText variant="muted">Period</ThemedText>
                <ThemedText variant="body">
                  {formatDate(subscription.current_period_start)} - {formatDate(subscription.current_period_end)}
                </ThemedText>
              </View>
              {subscription.cancel_at_period_end && (
                <View style={[styles.warningBox, { backgroundColor: colors.warning + '20', borderColor: colors.warning }]}>
                  <Icon name={icons.alert} size={16} color={colors.warning} />
                  <ThemedText variant="caption" style={{ color: colors.warning }}>
                    Your plan will cancel at the end of the billing period
                  </ThemedText>
                </View>
              )}
            </View>

            {canManageBilling && (
              <ThemedButton
                title="Manage Subscription"
                onPress={() => Alert.alert('Manage', 'Stripe customer portal would open here.')}
                variant="outline"
                size="sm"
              />
            )}
          </ThemedCard>
        )}

        {/* Available Plans */}
        <ThemedText variant="subtitle" style={styles.sectionTitle}>Available Plans</ThemedText>
        <View style={styles.plansGrid}>
          {TIERS.map((tier) => {
            const isCurrent = subscription?.tier === tier.key;
            return (
              <ThemedCard
                key={tier.key}
                variant={isCurrent ? 'elevated' : 'outlined'}
                padding="md"
                style={{
                  ...styles.planItem,
                  ...(isCurrent ? { borderColor: colors.primary, borderWidth: 2 } : {}),
                }}
              >
                <ThemedText variant="label" style={{ color: colors.primary }}>{tier.name}</ThemedText>
                <ThemedText variant="title">{tier.price}</ThemedText>
                <ThemedText variant="caption">/month</ThemedText>

                <View style={styles.planFeatures}>
                  {tier.features.map((feature, idx) => (
                    <View key={idx} style={styles.featureItem}>
                      <Icon name={icons.check} size={14} color={colors.success} />
                      <ThemedText variant="caption">{feature}</ThemedText>
                    </View>
                  ))}
                </View>

                {canManageBilling && !isCurrent && (
                  <ThemedButton
                    title={subscription ? 'Switch' : 'Select'}
                    onPress={() => handleCheckout(tier.key)}
                    variant="outline"
                    size="sm"
                  />
                )}
                {isCurrent && (
                  <View style={[styles.currentBadge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.currentBadgeText}>Current</Text>
                  </View>
                )}
              </ThemedCard>
            );
          })}
        </View>

        {/* Invoices */}
        {invoices.length > 0 && (
          <>
            <ThemedText variant="subtitle" style={styles.sectionTitle}>Invoices</ThemedText>
            {invoices.map((invoice) => (
              <ThemedCard key={invoice.id} variant="outlined" padding="md" style={styles.invoiceItem}>
                <View style={styles.invoiceRow}>
                  <View>
                    <ThemedText variant="body" weight="600">
                      ${(invoice.amount_due_cents / 100).toFixed(2)}
                    </ThemedText>
                    <ThemedText variant="caption">{formatDate(invoice.created_at)}</ThemedText>
                  </View>
                  <View style={styles.invoiceRight}>
                    <View style={[styles.invoiceStatus, { backgroundColor: invoice.status === 'paid' ? colors.success + '20' : colors.warning + '20' }]}>
                      <Text style={[styles.invoiceStatusText, { color: invoice.status === 'paid' ? colors.success : colors.warning }]}>
                        {invoice.status}
                      </Text>
                    </View>
                    {invoice.hosted_invoice_url && (
                      <TouchableOpacity>
                        <ThemedText variant="caption" style={{ color: colors.primary }}>View</ThemedText>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </ThemedCard>
            ))}
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  sectionTitle: { marginBottom: 16, marginTop: 8 },
  planCard: { marginBottom: 24 },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  planDetails: { marginBottom: 16, gap: 8 },
  planDetail: { gap: 2 },
  warningBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 8, borderWidth: 1 },
  plansGrid: { gap: 12, marginBottom: 24 },
  planItem: { gap: 4 },
  planFeatures: { marginVertical: 12, gap: 6 },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  currentBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, alignItems: 'center' },
  currentBadgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  invoiceItem: { marginBottom: 8 },
  invoiceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  invoiceRight: { alignItems: 'flex-end', gap: 4 },
  invoiceStatus: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  invoiceStatusText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
});
