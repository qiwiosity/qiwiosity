import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import { useCompare } from '../context/CompareContext';
import { useData } from '../context/DataContext';
import { colors, radius, spacing, type as typeStyles } from '../theme';

const GROUP_OPTIONS = [
  { id: 'none', label: 'All together' },
  { id: 'category', label: 'By category' },
  { id: 'region', label: 'By region' },
  { id: 'day', label: 'By day' },
];

// Simple day labels for region-based day grouping (placeholder until itinerary integration)
const DAY_LABELS = {
  auckland: 'Auckland day',
  rotorua: 'Rotorua day',
  queenstown: 'Queenstown day',
  'hawkes-bay': "Hawke's Bay day",
  wellington: 'Wellington day',
  coromandel: 'Coromandel day',
  canterbury: 'Canterbury day',
  'bay-of-plenty': 'Bay of Plenty day',
  otago: 'Otago day',
  southland: 'Southland day',
  northland: 'Northland day',
  waikato: 'Waikato day',
  taranaki: 'Taranaki day',
  'west-coast': 'West Coast day',
  'nelson-tasman': 'Nelson–Tasman day',
  marlborough: 'Marlborough day',
};

export default function CompareScreen({ navigation }) {
  const compare = useCompare();
  const { categories, regions, getPoiImages } = useData();
  // Default to 'none' (All together) so user sees all shortlisted items for comparison
  const [groupBy, setGroupBy] = useState('none');

  const catLabel = (id) => {
    const effectiveId = id === 'wildlife' ? 'nature' : id;
    return categories.find((c) => c.id === effectiveId)?.label || effectiveId;
  };
  const catColor = (id) => {
    const effectiveId = id === 'wildlife' ? 'nature' : id;
    return categories.find((c) => c.id === effectiveId)?.color || colors.primary;
  };
  const regionName = (id) => regions.find((r) => r.id === id)?.name || id;

  const groups = useMemo(() => {
    const items = compare.items;
    if (!items.length) return [];

    if (groupBy === 'none') {
      return [{ key: 'all', name: 'All shortlisted', items }];
    }
    if (groupBy === 'category') {
      const map = {};
      items.forEach((a) => {
        const key = (a.category === 'wildlife' ? 'nature' : a.category) || 'other';
        if (!map[key]) map[key] = { key, name: catLabel(key), items: [] };
        map[key].items.push(a);
      });
      return Object.values(map);
    }
    if (groupBy === 'region') {
      const map = {};
      items.forEach((a) => {
        const key = a.region || 'unknown';
        if (!map[key]) map[key] = { key, name: regionName(key), items: [] };
        map[key].items.push(a);
      });
      return Object.values(map);
    }
    if (groupBy === 'day') {
      const map = {};
      items.forEach((a) => {
        const key = a.region || 'unplanned';
        const name = DAY_LABELS[key] || 'Unplanned';
        if (!map[key]) map[key] = { key, name, items: [] };
        map[key].items.push(a);
      });
      return Object.values(map);
    }
    return [{ key: 'all', name: 'All', items }];
  }, [compare.items, groupBy, categories, regions]);

  // Map region for all compared items
  const mapRegion = useMemo(() => {
    const items = compare.items.filter((a) => a.lat && a.lng);
    if (!items.length) return null;
    const lats = items.map((a) => a.lat);
    const lngs = items.map((a) => a.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const padLat = Math.max((maxLat - minLat) * 0.3, 0.05);
    const padLng = Math.max((maxLng - minLng) * 0.3, 0.05);
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: maxLat - minLat + padLat,
      longitudeDelta: maxLng - minLng + padLng,
    };
  }, [compare.items]);

  if (compare.items.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="git-compare-outline" size={48} color={colors.border} />
        <Text style={[typeStyles.heading, { marginTop: 16 }]}>Nothing to compare yet</Text>
        <Text style={[typeStyles.body, { color: colors.muted, textAlign: 'center', marginTop: 8 }]}>
          Browse attractions and tap the compare button to add items here. Group them, compare side
          by side, and use Decision Mode to find your winners.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Group-by chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
        style={styles.chipScroll}
      >
        {GROUP_OPTIONS.map((g) => (
          <TouchableOpacity
            key={g.id}
            style={[styles.chip, groupBy === g.id && styles.chipActive]}
            onPress={() => setGroupBy(g.id)}
          >
            <Text style={[styles.chipText, groupBy === g.id && styles.chipTextActive]}>
              {g.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Mini map */}
        {mapRegion && (
          <View style={styles.mapWrap}>
            <MapView style={styles.map} region={mapRegion} scrollEnabled={false} zoomEnabled={false}>
              {compare.items
                .filter((a) => a.lat && a.lng)
                .map((a) => (
                  <Marker
                    key={a.id}
                    coordinate={{ latitude: a.lat, longitude: a.lng }}
                    pinColor={catColor(a.category)}
                    title={a.name}
                  />
                ))}
            </MapView>
            <Text style={styles.mapLabel}>{compare.items.length} locations</Text>
          </View>
        )}

        {/* Grouped items */}
        {groups.map((g) => (
          <View key={g.key} style={styles.groupSection}>
            <View style={styles.groupHeader}>
              <View>
                <Text style={typeStyles.heading}>{g.name}</Text>
                <Text style={typeStyles.caption}>
                  {g.items.length} option{g.items.length > 1 ? 's' : ''}
                </Text>
              </View>
              {g.items.length >= 2 && (
                <TouchableOpacity
                  style={styles.decideBtn}
                  onPress={() =>
                    navigation.navigate('Decision', {
                      groupName: g.name,
                      itemIds: g.items.map((i) => i.id),
                    })
                  }
                >
                  <Text style={styles.decideBtnText}>🏆 Decide</Text>
                </TouchableOpacity>
              )}
            </View>

            {g.items.map((a) => {
              const imgs = getPoiImages(a.id);
              const thumb = imgs.length > 0 ? imgs[0] : null;
              return (
                <View key={a.id} style={styles.itemCard}>
                  {thumb ? (
                    <Image source={{ uri: thumb }} style={styles.itemThumb} resizeMode="cover" />
                  ) : (
                    <View style={[styles.itemThumb, styles.itemThumbPlaceholder, { backgroundColor: catColor(a.category) }]}>
                      <Ionicons name="image-outline" size={14} color="rgba(255,255,255,0.7)" />
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.itemInfo}
                    onPress={() => navigation.navigate('AttractionDetail', { id: a.id })}
                  >
                    <Text style={styles.itemName} numberOfLines={1}>
                      {a.name}
                    </Text>
                    <Text style={typeStyles.caption}>
                      {regionName(a.region)} · {a.duration_hours || '?'}h · {catLabel(a.category)}
                    </Text>
                  </TouchableOpacity>
                  {a.review_rating ? (
                    <Text style={styles.itemRating}>★ {a.review_rating}</Text>
                  ) : null}
                  <TouchableOpacity style={styles.removeBtn} onPress={() => compare.remove(a.id)}>
                    <Ionicons name="close" size={18} color={colors.muted} />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  empty: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  chipScroll: { flexGrow: 0 },
  chipRow: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.xs },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.text },
  chipTextActive: { color: '#fff' },
  mapWrap: {
    margin: spacing.md,
    height: 160,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  map: { flex: 1 },
  mapLabel: {
    position: 'absolute',
    bottom: 6,
    left: 8,
    fontSize: 11,
    fontWeight: '600',
    color: colors.primaryDark,
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  groupSection: { marginHorizontal: spacing.md, marginTop: spacing.lg },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  decideBtn: {
    backgroundColor: colors.accent,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.md,
  },
  decideBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginBottom: spacing.xs,
    gap: 8,
  },
  itemThumb: { width: 50, height: 50, borderRadius: radius.sm },
  itemThumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  itemInfo: { flex: 1, minWidth: 0 },
  itemName: { fontSize: 13, fontWeight: '600' },
  itemRating: { fontSize: 12, fontWeight: '600', color: colors.accent },
  removeBtn: { padding: 4 },
});
