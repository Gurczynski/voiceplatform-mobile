// Billing & Subscription Screen
import { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Text, Alert, Linking } from 'react-native';
import { useThemeContext } from '../../src/theme/ThemeProvider';
import { useAuthStore } from '../../src/stores';
import { supabase, callEdgeFunction } from '../../src/lib/supabase';
import { ThemedView, ThemedText, ThemedHeader, Icon, icons } from '../../src/components/ui';
import { PLANS, TRIAL_CONFIG, getAnnualSavingsPercent } from '../../src/config/pricing';

export default function BillingScreen() {
  const { theme } = useThemeContext();
  const { colors } = theme;
  const { currentOrganization, membership } = useAuthStore();
  const [subscription, setSubscription] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  const canManage = ['owner', 'admin', 'billing_admin'].includes(membership?.role || '');

  useEffect(() => { if (currentOrganization?.id) loadBilling(); }, [currentOrganization?.id]);

  const loadBilling = async () => {
    const [subRes, invRes] = await Promise.all([
      supabase.from('subscriptions').select('*').eq('organization_id', currentOrganization!.id).single(),
      supabase.from('invoices').select('*').eq('organization_id', currentOrganization!.id).order('created_at', { ascending: false }).limit(10),
    ]);
    setSubscription(subRes.data);
    setInvoices(invRes.data || []);
    setLoading(false);
  };

  const handleCheckout = async (tier: string) => {
    if (!canManage) return;
    setCheckoutLoading(tier);

    const { data, error } = await callEdgeFunction('stripe-checkout', {
      organizationId: currentOrganization!.id,
      tier,
      billingCycle,
    });

    setCheckoutLoading(null);

    if (error) {
      Alert.alert('Error', error);
    } else if (data?.url) {
      Linking.openURL(data.url);
    } else {
      Alert.alert('Setup Required', 'Please configure Stripe keys in your Supabase Edge Function secrets.');
    }
  };

  const handleManageBilling = async () => {
    const { data, error } = await callEdgeFunction('stripe-portal', {
      organizationId: currentOrganization!.id,
    });
    if (data?.url) {
      Linking.openURL(data.url);
    } else {
      Alert.alert('Info', 'Billing portal will be available after your first payment.');
    }
  };

  const getDaysLeft = () => {
    if (!subscription?.trial_end) return null;
    const end = new Date(subscription.trial_end);
    const now = new Date();
    const days = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  const isTrial = subscription?.status === 'trialing';
  const isActive = subscription?.status === 'active';
  const daysLeft = getDaysLeft();

  const getStatusColor = (status: string) => {
    if (status === 'active') return colors.success;
    if (status === 'trialing') return colors.primary;
    if (status === 'past_due') return colors.warning;
    return colors.error;
  };

  return (
    <ThemedView variant="default" style={styles.container}>
      <ThemedHeader title="Billing" showBack />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Trial Banner */}
        {isTrial && daysLeft !== null && (
          <View style={[styles.trialBanner, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}>
            <Icon name={icons.clock} size={24} color={colors.primary} />
            <View style={styles.trialInfo}>
              <Text style={[styles.trialTitle, { color: colors.text }]}>Free Trial</Text>
              <Text style={[styles.trialDays, { color: colors.primary }]}>
                {daysLeft} days remaining
              </Text>
              <Text style={[styles.trialDesc, { color: colors.textMuted }]}>
                You have full access to Professional features
              </Text>
            </View>
          </View>
        )}

        {/* Current Plan */}
        {subscription && (
          <View style={[styles.planCard, { backgroundColor: colors.surfaceAlt }]}>
            <View style={styles.planHeader}>
              <View>
                <Text style={[styles.planLabel, { color: colors.textMuted }]}>Current Plan</Text>
                <Text style={[styles.planName, { color: colors.text }]}>
                  {PLANS[subscription.tier as keyof typeof PLANS]?.name || subscription.tier}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(subscription.status) + '15' }]}>
                <Text style={[styles.statusText, { color: getStatusColor(subscription.status) }]}>
                  {subscription.status}
                </Text>
              </View>
            </View>

            {subscription.current_period_end && (
              <Text style={[styles.periodText, { color: colors.textMuted }]}>
                {isTrial ? 'Trial ends' : 'Renews'}: {new Date(subscription.current_period_end).toLocaleDateString()}
              </Text>
            )}

            {isActive && canManage && (
              <TouchableOpacity onPress={handleManageBilling} style={[styles.manageBtn, { borderColor: colors.border }]}>
                <Text style={{ color: colors.primary, fontWeight: '600' }}>Manage Subscription</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Billing Cycle Toggle */}
        <View style={[styles.cycleToggle, { backgroundColor: colors.surfaceAlt }]}>
          <TouchableOpacity
            style={[styles.cycleBtn, { backgroundColor: billingCycle === 'monthly' ? colors.primary : 'transparent' }]}
            onPress={() => setBillingCycle('monthly')}
          >
            <Text style={{ color: billingCycle === 'monthly' ? '#FFF' : colors.text, fontWeight: '600' }}>Monthly</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.cycleBtn, { backgroundColor: billingCycle === 'annual' ? colors.primary : 'transparent' }]}
            onPress={() => setBillingCycle('annual')}
          >
            <Text style={{ color: billingCycle === 'annual' ? '#FFF' : colors.text, fontWeight: '600' }}>Annual</Text>
            <View style={[styles.saveBadge, { backgroundColor: colors.success }]}>
              <Text style={styles.saveText}>Save 17%</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Plans */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Choose Your Plan</Text>
        {Object.entries(PLANS).map(([key, plan]) => {
          const isCurrent = subscription?.tier === key;
          const price = billingCycle === 'monthly' ? plan.monthlyPrice : plan.annualPrice;
          const savings = billingCycle === 'annual' ? getAnnualSavingsPercent(plan.monthlyPrice, plan.annualPrice) : 0;

          return (
            <View key={key} style={[styles.planCard, { backgroundColor: colors.surfaceAlt, borderColor: isCurrent ? colors.primary : 'transparent', borderWidth: isCurrent ? 2 : 0 }]}>
              {'popular' in plan && plan.popular && (
                <View style={[styles.popularBadge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.popularText}>Most Popular</Text>
                </View>
              )}
              <View style={styles.planTop}>
                <Text style={[styles.planCardName, { color: colors.text }]}>{plan.name}</Text>
                <Text style={[styles.planDesc, { color: colors.textMuted }]}>{plan.description}</Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={[styles.price, { color: colors.text }]}>${price}</Text>
                <Text style={[styles.pricePeriod, { color: colors.textMuted }]}>
                  /{billingCycle === 'monthly' ? 'mo' : 'yr'}
                </Text>
                {savings > 0 && (
                  <View style={[styles.savingsBadge, { backgroundColor: colors.success + '15' }]}>
                    <Text style={[styles.savingsText, { color: colors.success }]}>Save {savings}%</Text>
                  </View>
                )}
              </View>
              <View style={styles.featuresList}>
                {plan.features.map((feature, idx) => (
                  <View key={idx} style={styles.featureRow}>
                    <Icon name={icons.check} size={16} color={colors.success} />
                    <Text style={[styles.featureText, { color: colors.textSecondary }]}>{feature}</Text>
                  </View>
                ))}
              </View>
              {canManage && !isCurrent && (
                <TouchableOpacity
                  onPress={() => handleCheckout(key)}
                  disabled={checkoutLoading === key}
                  style={[styles.selectBtn, { backgroundColor: 'popular' in plan && plan.popular ? colors.primary : colors.surface }]}
                >
                  <Text style={{ color: 'popular' in plan && plan.popular ? '#FFF' : colors.primary, fontWeight: '600' }}>
                    {checkoutLoading === key ? 'Processing...' : isTrial ? 'Upgrade Now' : 'Switch Plan'}
                  </Text>
                </TouchableOpacity>
              )}
              {isCurrent && (
                <View style={[styles.currentBadge, { backgroundColor: colors.success + '15' }]}>
                  <Icon name={icons.check} size={16} color={colors.success} />
                  <Text style={{ color: colors.success, fontWeight: '600' }}>Current Plan</Text>
                </View>
              )}
            </View>
          );
        })}

        {/* Invoices */}
        {invoices.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Invoices</Text>
            {invoices.map(inv => (
              <View key={inv.id} style={[styles.invoiceCard, { backgroundColor: colors.surfaceAlt }]}>
                <View style={styles.invoiceRow}>
                  <View>
                    <Text style={[styles.invoiceAmount, { color: colors.text }]}>${(inv.amount_due_cents / 100).toFixed(2)}</Text>
                    <Text style={[styles.invoiceDate, { color: colors.textMuted }]}>{new Date(inv.created_at).toLocaleDateString()}</Text>
                  </View>
                  <View style={[styles.invoiceStatus, { backgroundColor: inv.status === 'paid' ? colors.success + '15' : colors.warning + '15' }]}>
                    <Text style={{ color: inv.status === 'paid' ? colors.success : colors.warning, fontSize: 12, fontWeight: '600' }}>{inv.status}</Text>
                  </View>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 24 },
  trialBanner: { flexDirection: 'row', padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 16, gap: 12 },
  trialInfo: { flex: 1, gap: 4 },
  trialTitle: { fontSize: 16, fontWeight: '700' },
  trialDays: { fontSize: 20, fontWeight: '700' },
  trialDesc: { fontSize: 13 },
  planCard: { padding: 16, borderRadius: 16, marginBottom: 12 },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  planLabel: { fontSize: 12 },
  planName: { fontSize: 18, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  periodText: { fontSize: 13 },
  manageBtn: { marginTop: 12, padding: 10, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  cycleToggle: { flexDirection: 'row', borderRadius: 12, padding: 4, marginBottom: 20 },
  cycleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, borderRadius: 10 },
  saveBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  saveText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  popularBadge: { position: 'absolute', top: -1, right: 16, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 0, borderBottomLeftRadius: 8, borderBottomRightRadius: 8 },
  popularText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  planTop: { marginBottom: 12 },
  planCardName: { fontSize: 20, fontWeight: '700' },
  planDesc: { fontSize: 13, marginTop: 2 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 16 },
  price: { fontSize: 32, fontWeight: '700' },
  pricePeriod: { fontSize: 14 },
  savingsBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  savingsText: { fontSize: 11, fontWeight: '600' },
  featuresList: { gap: 8, marginBottom: 16 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featureText: { fontSize: 14 },
  selectBtn: { padding: 12, borderRadius: 10, alignItems: 'center' },
  currentBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 10, borderRadius: 10 },
  invoiceCard: { padding: 14, borderRadius: 12, marginBottom: 8 },
  invoiceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  invoiceAmount: { fontSize: 16, fontWeight: '600' },
  invoiceDate: { fontSize: 12 },
  invoiceStatus: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
});
