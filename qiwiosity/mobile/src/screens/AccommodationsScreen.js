import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../context/DataContext';
import { useItinerary } from '../context/ItineraryContext';
import { colors, radius, spacing, type } from '../theme';

// Accommodation types — mirrors ACCOMMODATION_TYPES in prototype.html so the
// web and mobile experiences stay in sync.
const TYPES = [
  { id: 'all', label: 'All', color: colors.primary },
  { id: 'hotel', label: 'Hotels', color: '#1565C0' },
  { id: 'motel', label: 'Motels', color: '#EF6C00' },
  { id: 'holiday-park', label: 'Holiday Parks', color: '#2E7D32' },
  { id: 'lodge', label: 'Luxury Lodges', color: '#6A1B9A' },
];

const typeLabel = (id) => TYPES.find((t) => t.id === id)?.label || id;
const typeColor = (id) => TYPES.find((t) => t.id === id)?.color || colors.primary;

export default function AccommodationsScreen({ navigation }) {
  const { accommodations, regions } = useData();
  const { addAccommodation, has, remove } = useItinerary();
  const [typeFilter, setTypeFilter] = useState('all');
  const [regionFilter, setRegionFilter] = useState('all');
  const [query, setQuery] = useState('');

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return accommodations.filter((a) => {
      if (typeFilter !== 'all' && a.type !== typeFilter) return false;
      if (regionFilter !== 'all' && a.region !== regionFilter) return false;
      if (!q) return true;
      const regionName = regions.find((r) => r.id === a.region)?.name || '';
      return (
        a.name.toLowerCase().includes(q) ||
        a.short.toLowerCase().includes(q) ||
        regionName.toLowerCase().includes(q)
      );
    });
  }, [typeFilter, regionFilter, query]);

  const regionOptions = useMemo(
    () => [{ id: 'all', name: 'All regions' }, ...regions],
    []
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={type.title}>Where to Stay</Text>
        <Text style={[type.caption, { marginTop: 4 }]}>
          {accommodations.length} places across {regions.length} regions · {visible.length} match
        </Text>
        <TextInput
          placeholder="Search by name or region..."
          placeholderTextColor={colors.muted}
          style={styles.search}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      {/* Type chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {TYPES.map((t) => (
          <TouchableOpacity
            key={t.id}
            onPress={() => setTypeFilter(t.id)}
            style={[
              styles.chip,
              typeFilter === t.id && { backgroundColor: t.color, borderColor: t.color },
            ]}
          >
            <Text
              style={[styles.chipText, typeFilter === t.id && { color: 'white' }]}
            >
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Region chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {regionOptions.map((r) => (
          <TouchableOpacity
            key={r.id}
            onPress={() => setRegionFilter(r.id)}
            style={[
              styles.regionChip,
              regionFilter === r.id && styles.regionChipOn,
            ]}
          >
            <Text
              style={[
                styles.chipText,
                regionFilter === r.id && { color: 'white' },
              ]}
              numberOfLines={1}
            >
              {r.id === 'all' ? 'All regions' : r.name.split(' / ')[0]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={visible}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl }}
        initialNumToRender={20}
        maxToRenderPerBatch={20}
        windowSize={10}
        ListEmptyComponent={
          <Text style={[type.caption, { textAlign: 'center', padding: spacing.xl }]}>
            No accommodations match your filters.
          </Text>
        }
        renderItem={({ item }) => {
          const region = regions.find((r) => r.id === item.region);
          const inTrip = has(item.id);
          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('AccommodationDetail', { id: item.id })}
            >
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={type.heading}>{item.name}</Text>
                  <Text style={[type.caption, { marginTop: 2 }]}>
                    {region?.name || item.region}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.tripBtn, inTrip && styles.tripBtnActive]}
                  onPress={() => inTrip ? remove(item.id) : addAccommodation(item)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={inTrip ? 'checkmark-circle' : 'add-circle-outline'}
                    size={16}
                    color={inTrip ? '#fff' : colors.primary}
                  />
                  <Text style={[styles.tripBtnText, inTrip && styles.tripBtnTextActive]}>
                    {inTrip ? 'Added' : 'Add to trip'}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.typeRow}>
                <View
                  style={[styles.typeDot, { backgroundColor: typeColor(item.type) }]}
                />
                <Text style={[type.caption, { marginLeft: 6 }]}>
                  {typeLabel(item.type)}
                </Text>
              </View>
              <Text style={[type.body, { marginTop: 8 }]}>{item.short}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.price}>
                  NZ${item.price_nzd_per_night}
                  <Text style={type.caption}> /night</Text>
                </Text>
                <Text style={styles.rating}>★ {item.rating.toFixed(1)}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingTop: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  search: {
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: colors.text,
  },
  chipRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
    backgroundColor: colors.surface,
  },
  regionChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 6,
    backgroundColor: colors.surface,
    maxWidth: 200,
  },
  regionChipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...type.caption, color: colors.text, fontWeight: '600' },
  card: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  tripBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  tripBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tripBtnText: { fontSize: 11, fontWeight: '700', color: colors.primary },
  tripBtnTextActive: { color: '#fff' },
  typeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  typeDot: { width: 8, height: 8, borderRadius: 4 },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  price: { color: colors.accent, fontWeight: '700', fontSize: 16 },
  rating: { color: colors.text, fontWeight: '600' },
});
