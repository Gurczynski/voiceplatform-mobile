// Add-ons Store - Browse and purchase add-ons
import { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Text, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeContext } from '../../../src/theme/ThemeProvider';
import { useAuthStore } from '../../../src/stores';
import { supabase, callEdgeFunction } from '../../../src/lib/supabase';
import { ThemedView, ThemedText, ThemedHeader, Icon, icons } from '../../../src/components/ui';
import { ADDONS, getAddonsByCategory, formatPrice } from '../../../src/config/addons';

const CATEGORIES = [
  { key: 'ai', label: 'AI Features', icon: '🤖', color: '#EC4899' },
  { key: 'numbers', label: 'Phone Numbers', icon: '📱', color: '#3B82F6' },
  { key: 'users', label: 'Team', icon: '👥', color: '#10B981' },
  { key: 'storage', label: 'Storage', icon: '💾', color: '#F59E0B' },
  { key: 'features', label: 'Features', icon: '⚡', color: '#8B5CF6' },
];

export default function AddonsScreen() {
  const { theme } = useThemeContext();
  const { colors } = theme;
  const { currentOrganization } = useAuthStore();
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState('ai');
  const [purchasedAddons, setPurchasedAddons] = useState<string[]>([]);
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => { if (currentOrganization?.id) loadPurchased(); }, [currentOrganization?.id]);

  const loadPurchased = async () => {
    const { data } = await supabase
      .from('subscriptions')
      .select('metadata')
      .eq('organization_id', currentOrganization!.id)
      .single();
    if (data?.metadata?.addons) {
      setPurchasedAddons(data.metadata.addons);
    }
  };

  const purchaseAddon = async (addonKey: string) => {
    if (!currentOrganization?.id) return;
    const addon = ADDONS[addonKey as keyof typeof ADDONS];
    if (!addon) return;

    Alert.alert(
      'Purchase Add-on',
      `${addon.name}\n${addon.description}\n\n${formatPrice(addon.price)}/${addon.unit}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Purchase',
          onPress: async () => {
            setLoading(addonKey);
            const { data, error } = await callEdgeFunction('stripe-checkout', {
              organizationId: currentOrganization.id,
              addonId: addon.id,
              price: addon.price,
              name: addon.name,
            });
            setLoading(null);

            if (error) {
              Alert.alert('Error', error);
            } else {
              Alert.alert('Success', `${addon.name} added to your subscription!`);
              setPurchasedAddons(prev => [...prev, addonKey]);
            }
          }
        },
      ]
    );
  };

  const addons = getAddonsByCategory(selectedCategory);

  return (
    <ThemedView variant="default" style={styles.container}>
      <ThemedHeader title="Add-ons" showBack />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.infoCard, { backgroundColor: colors.surfaceAlt }]}>
          <Icon name={icons.star} size={20} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Enhance your plan with add-ons. Add features, capacity, or AI capabilities as you grow.
          </Text>
        </View>

        {/* Category Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryRow} contentContainerStyle={styles.categoryContent}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat.key}
              style={[styles.categoryTab, { backgroundColor: selectedCategory === cat.key ? colors.primary : colors.surfaceAlt }]}
              onPress={() => setSelectedCategory(cat.key)}
            >
              <Text style={styles.categoryIcon}>{cat.icon}</Text>
              <Text style={[styles.categoryLabel, { color: selectedCategory === cat.key ? '#FFF' : colors.text }]}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Add-ons Grid */}
        <View style={styles.addonsGrid}>
          {addons.map(addon => {
            const isPurchased = purchasedAddons.includes(addon.key);
            const isLoading = loading === addon.key;
            const isPopular = 'popular' in addon && addon.popular;

            return (
              <View key={addon.key} style={[styles.addonCard, { backgroundColor: colors.surfaceAlt }]}>
                {isPopular && (
                  <View style={[styles.popularBadge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.popularText}>Popular</Text>
                  </View>
                )}
                <Text style={styles.addonIcon}>{addon.icon}</Text>
                <Text style={[styles.addonName, { color: colors.text }]}>{addon.name}</Text>
                <Text style={[styles.addonDesc, { color: colors.textMuted }]}>{addon.description}</Text>
                <View style={styles.priceRow}>
                  <Text style={[styles.addonPrice, { color: colors.primary }]}>{formatPrice(addon.price)}</Text>
                  <Text style={[styles.addonUnit, { color: colors.textMuted }]}>/{addon.unit}</Text>
                </View>

                {isPurchased ? (
                  <View style={[styles.purchasedBtn, { backgroundColor: colors.success + '15' }]}>
                    <Icon name={icons.check} size={16} color={colors.success} />
                    <Text style={[styles.purchasedText, { color: colors.success }]}>Active</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.buyBtn, { backgroundColor: colors.primary }]}
                    onPress={() => purchaseAddon(addon.key)}
                    disabled={isLoading}
                  >
                    <Text style={styles.buyBtnText}>{isLoading ? 'Processing...' : 'Add to Plan'}</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>

        {/* Bundle Deals */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Bundle Deals</Text>
        <View style={[styles.bundleCard, { backgroundColor: colors.surfaceAlt }]}>
          <View style={styles.bundleHeader}>
            <Text style={styles.bundleIcon}>🚀</Text>
            <View style={styles.bundleInfo}>
              <Text style={[styles.bundleName, { color: colors.text }]}>Growth Bundle</Text>
              <Text style={[styles.bundleDesc, { color: colors.textMuted }]}>AI Voice 500 + AI Messages 2000 + Extra Number</Text>
            </View>
          </View>
          <View style={styles.bundlePricing}>
            <Text style={[styles.bundleOriginal, { color: colors.textMuted }]}>$100/mo</Text>
            <Text style={[styles.bundlePrice, { color: colors.primary }]}>$85/mo</Text>
            <View style={[styles.saveBadge, { backgroundColor: colors.success }]}>
              <Text style={styles.saveText}>Save 15%</Text>
            </View>
          </View>
          <TouchableOpacity style={[styles.bundleBtn, { backgroundColor: colors.primary }]}>
            <Text style={styles.bundleBtnText}>Get Bundle</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.bundleCard, { backgroundColor: colors.surfaceAlt }]}>
          <View style={styles.bundleHeader}>
            <Text style={styles.bundleIcon}>💼</Text>
            <View style={styles.bundleInfo}>
              <Text style={[styles.bundleName, { color: colors.text }]}>Business Bundle</Text>
              <Text style={[styles.bundleDesc, { color: colors.textMuted }]}>AI Voice 1000 + AI Messages 10000 + Priority Support</Text>
            </View>
          </View>
          <View style={styles.bundlePricing}>
            <Text style={[styles.bundleOriginal, { color: colors.textMuted }]}>$210/mo</Text>
            <Text style={[styles.bundlePrice, { color: colors.primary }]}>$175/mo</Text>
            <View style={[styles.saveBadge, { backgroundColor: colors.success }]}>
              <Text style={styles.saveText}>Save 17%</Text>
            </View>
          </View>
          <TouchableOpacity style={[styles.bundleBtn, { backgroundColor: colors.primary }]}>
            <Text style={styles.bundleBtnText}>Get Bundle</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 24 },
  infoCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, marginBottom: 16 },
  infoText: { flex: 1, fontSize: 14, lineHeight: 20 },
  categoryRow: { marginBottom: 16 },
  categoryContent: { gap: 8 },
  categoryTab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  categoryIcon: { fontSize: 16 },
  categoryLabel: { fontSize: 14, fontWeight: '600' },
  addonsGrid: { gap: 12, marginBottom: 24 },
  addonCard: { padding: 16, borderRadius: 16, position: 'relative' },
  popularBadge: { position: 'absolute', top: 12, right: 12, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  popularText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  addonIcon: { fontSize: 32, marginBottom: 8 },
  addonName: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  addonDesc: { fontSize: 13, marginBottom: 12 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 12 },
  addonPrice: { fontSize: 24, fontWeight: '700' },
  addonUnit: { fontSize: 13, marginLeft: 4 },
  buyBtn: { paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  buyBtnText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  purchasedBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10 },
  purchasedText: { fontSize: 14, fontWeight: '600' },
  sectionTitle: { fontSize: 20, fontWeight: '700', marginBottom: 14 },
  bundleCard: { padding: 16, borderRadius: 16, marginBottom: 12 },
  bundleHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  bundleIcon: { fontSize: 32 },
  bundleInfo: { flex: 1 },
  bundleName: { fontSize: 16, fontWeight: '700' },
  bundleDesc: { fontSize: 13 },
  bundlePricing: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  bundleOriginal: { fontSize: 14, textDecorationLine: 'line-through' },
  bundlePrice: { fontSize: 20, fontWeight: '700' },
  saveBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  saveText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  bundleBtn: { paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  bundleBtnText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
});
