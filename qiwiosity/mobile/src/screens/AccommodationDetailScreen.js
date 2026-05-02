import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../context/DataContext';
import { useItinerary } from '../context/ItineraryContext';
import { openDirectionsTo } from '../utils/directions';
import { colors, radius, spacing, type } from '../theme';

const TYPES = {
  hotel: { label: 'Hotel', color: '#1565C0', icon: 'business' },
  motel: { label: 'Motel', color: '#EF6C00', icon: 'car' },
  'holiday-park': { label: 'Holiday Park', color: '#2E7D32', icon: 'bonfire' },
  lodge: { label: 'Luxury Lodge', color: '#6A1B9A', icon: 'leaf' },
};

function openBookingSearch(name) {
  const q = encodeURIComponent(`${name} New Zealand`);
  const url = Platform.select({
    ios: `https://www.google.com/travel/hotels?q=${q}`,
    default: `https://www.google.com/travel/hotels?q=${q}`,
  });
  Linking.openURL(url).catch(() =>
    Alert.alert('Could not open browser', 'Please search for this property manually.')
  );
}

export default function AccommodationDetailScreen({ route }) {
  const { accommodations, regions } = useData();
  const { addAccommodation, has, remove } = useItinerary();
  const { id } = route.params || {};
  const accom = accommodations.find((a) => a.id === id);

  if (!accom) {
    return (
      <View style={styles.container}>
        <Text style={type.body}>Accommodation not found.</Text>
      </View>
    );
  }

  const region = regions.find((r) => r.id === accom.region);
  const typeInfo = TYPES[accom.type] || { label: accom.type, color: colors.primary, icon: 'bed' };
  const inTrip = has(accom.id);

  const toggle = () => {
    if (inTrip) {
      remove(accom.id);
      Alert.alert('Removed from itinerary');
    } else {
      addAccommodation(accom);
      Alert.alert('Added to your itinerary');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Colour hero */}
      <View style={[styles.hero, { backgroundColor: typeInfo.color }]}>
        <Ionicons name={typeInfo.icon} size={28} color="rgba(255,255,255,0.5)" />
        <Text style={styles.heroType}>{typeInfo.label}</Text>
        <Text style={styles.heroTitle}>{accom.name}</Text>
        <Text style={styles.heroMeta}>{region?.name || accom.region}</Text>
      </View>

      <View style={styles.body}>
        {/* Price + Rating row */}
        <View style={styles.priceRow}>
          <View>
            <Text style={styles.price}>NZ${accom.price_nzd_per_night}</Text>
            <Text style={type.caption}>per night</Text>
          </View>
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingText}>★ {accom.rating.toFixed(1)}</Text>
          </View>
        </View>

        <Text style={[type.body, { marginTop: spacing.lg }]}>{accom.short}</Text>

        {/* Quick actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickAction} onPress={() => openDirectionsTo(accom)}>
            <Ionicons name="navigate" size={18} color={colors.primary} />
            <Text style={styles.quickActionText}>Directions</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction} onPress={() => openBookingSearch(accom.name)}>
            <Ionicons name="open-outline" size={18} color={colors.primary} />
            <Text style={styles.quickActionText}>Book online</Text>
          </TouchableOpacity>
        </View>

        {/* Add / Remove from itinerary */}
        <TouchableOpacity
          style={[styles.cta, inTrip ? styles.ctaRemove : styles.ctaAdd]}
          onPress={toggle}
        >
          <Text style={styles.ctaText}>
            {inTrip ? 'Remove from itinerary' : '+ Add to itinerary'}
          </Text>
        </TouchableOpacity>

        {/* Location info */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Location</Text>
          <Text style={type.body}>
            {region?.name || accom.region} · {region?.island || 'New Zealand'}
          </Text>
          <Text style={type.caption}>
            {accom.lat.toFixed(4)}° S, {Math.abs(accom.lng).toFixed(4)}° E
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  hero: { padding: spacing.xl, paddingBottom: spacing.xxl, gap: 4 },
  heroType: { color: 'rgba(255,255,255,0.7)', fontSize: 11, letterSpacing: 1.5, fontWeight: '700', marginTop: 8 },
  heroTitle: { color: 'white', fontSize: 24, fontWeight: '700', marginTop: 2 },
  heroMeta: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 4 },
  body: { padding: spacing.lg },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: { fontSize: 28, fontWeight: '700', color: colors.accent },
  ratingBadge: {
    backgroundColor: '#FFF8E1',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#FFD54F',
  },
  ratingText: { fontSize: 16, fontWeight: '700', color: '#F57F17' },
  quickActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl },
  quickAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  quickActionText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  cta: { marginTop: spacing.md, paddingVertical: 14, borderRadius: radius.md, alignItems: 'center' },
  ctaAdd: { backgroundColor: colors.primary },
  ctaRemove: { backgroundColor: colors.danger },
  ctaText: { color: 'white', fontWeight: '700', fontSize: 15 },
  infoSection: {
    marginTop: spacing.xxl,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoTitle: { ...type.heading, marginBottom: spacing.sm },
});
