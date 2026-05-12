import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../context/DataContext';
import { useItinerary } from '../context/ItineraryContext';
import { useCompare } from '../context/CompareContext';
import { colors, radius, spacing, type } from '../theme';

// Accommodation type helpers
const ACCOM_TYPES = {
  hotel: { label: 'Hotel', color: '#1565C0' },
  motel: { label: 'Motel', color: '#EF6C00' },
  'holiday-park': { label: 'Holiday Park', color: '#2E7D32' },
  lodge: { label: 'Luxury Lodge', color: '#6A1B9A' },
};

const GROUP_OPTIONS = [
  { id: 'region', label: 'By region' },
  { id: 'type', label: 'By type' },
];

export default function BrowseScreen({ navigation }) {
  const { attractions, accommodations, regions, categories, getPoiImages } = useData();
  const { add, addAccommodation, has, remove } = useItinerary();
  const compare = useCompare();
  const [query, setQuery] = useState('');
  const [groupBy, setGroupBy] = useState('region');

  // Merge attractions and accommodations into one unified list
  const allItems = useMemo(() => {
    const pois = attractions.map((a) => ({ ...a, itemType: 'poi' }));
    const accoms = accommodations.map((a) => ({
      ...a,
      itemType: 'accommodation',
      category: 'accommodation',
    }));
    return [...pois, ...accoms];
  }, [attractions, accommodations]);

  // Filter by search query
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allItems;
    return allItems.filter((item) => {
      const regionName = regions.find((r) => r.id === item.region)?.name || '';
      const catLabel =
        item.itemType === 'accommodation'
          ? (ACCOM_TYPES[item.type]?.label || 'Accommodation')
          : (categories.find((c) => c.id === item.category)?.label || '');
      return (
        item.name.toLowerCase().includes(q) ||
        (item.short || '').toLowerCase().includes(q) ||
        regionName.toLowerCase().includes(q) ||
        catLabel.toLowerCase().includes(q) ||
        (item.tags || []).some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [query, allItems, regions, categories]);

  // Group into sections
  const sections = useMemo(() => {
    if (groupBy === 'region') {
      const map = {};
      filtered.forEach((item) => {
        const key = item.region || 'unknown';
        const region = regions.find((r) => r.id === key);
        const name = region?.name || key;
        if (!map[key]) map[key] = { key, title: name, island: region?.island || '', data: [] };
        map[key].data.push(item);
      });
      // Sort: North Island regions first, then South Island, alphabetically within each
      return Object.values(map).sort((a, b) => {
        if (a.island !== b.island) return a.island === 'North' ? -1 : 1;
        return a.title.localeCompare(b.title);
      });
    }

    if (groupBy === 'type') {
      const map = {};
      filtered.forEach((item) => {
        let key, label, sortOrder;
        if (item.itemType === 'accommodation') {
          key = `accom-${item.type}`;
          label = ACCOM_TYPES[item.type]?.label || item.type;
          sortOrder = 100; // accommodations after attractions
        } else {
          key = item.category;
          label = categories.find((c) => c.id === item.category)?.label || item.category;
          sortOrder = 0;
        }
        if (!map[key]) map[key] = { key, title: label, sortOrder, data: [] };
        map[key].data.push(item);
      });
      return Object.values(map).sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        return a.title.localeCompare(b.title);
      });
    }

    return [{ key: 'all', title: 'All', data: filtered }];
  }, [filtered, groupBy, regions, categories]);

  const getCatInfo = (item) => {
    if (item.itemType === 'accommodation') {
      return {
        label: ACCOM_TYPES[item.type]?.label || 'Accommodation',
        color: ACCOM_TYPES[item.type]?.color || '#5D4037',
      };
    }
    const cat = categories.find((c) => c.id === item.category);
    return { label: cat?.label || item.category, color: cat?.color || colors.primary };
  };

  const handlePress = (item) => {
    if (item.itemType === 'accommodation') {
      navigation.navigate('AccommodationDetail', { id: item.id });
    } else {
      navigation.navigate('AttractionDetail', { id: item.id });
    }
  };

  const handleLongPress = (item) => {
    // Long press opens full detail view
    handlePress(item);
  };

  const handleTrip = (item) => {
    if (has(item.id)) {
      remove(item.id);
    } else if (item.itemType === 'accommodation') {
      addAccommodation(item);
    } else {
      add(item);
    }
  };

  const renderItem = ({ item }) => {
    const catInfo = getCatInfo(item);
    const region = regions.find((r) => r.id === item.region);
    const inTrip = has(item.id);
    const inCompare = item.itemType !== 'accommodation' ? compare.has(item.id) : false;
    const imgs = item.itemType !== 'accommodation' ? getPoiImages(item.id) : [];
    const thumb = imgs.length > 0 ? imgs[0] : null;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => handlePress(item)}
        onLongPress={() => handleLongPress(item)}
        delayLongPress={400}
      >
        {thumb ? (
          <Image source={{ uri: thumb }} style={styles.cardThumb} resizeMode="cover" />
        ) : (
          <View style={[styles.cardStrip, { backgroundColor: catInfo.color }]} />
        )}
        <View style={{ flex: 1, padding: spacing.md }}>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={type.heading} numberOfLines={1}>{item.name}</Text>
              <Text style={[type.caption, { marginTop: 2 }]}>
                {region?.name?.split(' / ')[0] || item.region}
                {item.duration_hours ? ` · ${item.duration_hours}h` : ''}
                {' · '}{catInfo.label}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {item.itemType !== 'accommodation' && (
                <TouchableOpacity
                  style={[styles.tripBtn, inCompare && styles.compareBtnActive]}
                  onPress={() => compare.toggle(item)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={inCompare ? 'checkmark-circle' : 'git-compare-outline'}
                    size={16}
                    color={inCompare ? '#fff' : colors.primary}
                  />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.tripBtn, inTrip && styles.tripBtnActive]}
                onPress={() => handleTrip(item)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={inTrip ? 'checkmark-circle' : 'add-circle-outline'}
                  size={16}
                  color={inTrip ? '#fff' : colors.primary}
                />
                <Text style={[styles.tripBtnText, inTrip && styles.tripBtnTextActive]}>
                  {inTrip ? 'Added' : 'Add'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <Text style={[type.body, { marginTop: 6 }]} numberOfLines={2}>
            {item.short}
          </Text>
          {item.itemType === 'accommodation' && item.price_nzd_per_night && (
            <View style={styles.priceRow}>
              <Text style={styles.price}>NZ${item.price_nzd_per_night}/night</Text>
              {item.rating != null && (
                <Text style={styles.rating}>★ {item.rating.toFixed(1)}</Text>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const totalCount = filtered.length;

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        placeholder="Search by name, region, type..."
        placeholderTextColor={colors.muted}
        value={query}
        onChangeText={setQuery}
      />

      {/* Group-by chips */}
      <View style={styles.groupRow}>
        <Text style={[type.caption, { marginRight: spacing.sm }]}>
          {totalCount} places
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.xs }}
        >
          {GROUP_OPTIONS.map((g) => (
            <TouchableOpacity
              key={g.id}
              style={[styles.groupChip, groupBy === g.id && styles.groupChipActive]}
              onPress={() => setGroupBy(g.id)}
            >
              <Text style={[styles.groupChipText, groupBy === g.id && styles.groupChipTextActive]}>
                {g.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionCount}>{section.data.length}</Text>
          </View>
        )}
        contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: spacing.xxl }}
        stickySectionHeadersEnabled
        initialNumToRender={20}
        maxToRenderPerBatch={20}
        windowSize={10}
        ListEmptyComponent={
          <Text style={[type.caption, { textAlign: 'center', padding: spacing.xl }]}>
            No places match your search.
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  search: {
    margin: spacing.md,
    marginBottom: 0,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 14,
    color: colors.text,
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  groupChip: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  groupChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  groupChipText: { fontSize: 12, fontWeight: '600', color: colors.text },
  groupChipTextActive: { color: '#fff' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginTop: spacing.md,
  },
  sectionTitle: { ...type.heading, fontSize: 15 },
  sectionCount: { ...type.caption, fontSize: 12, fontWeight: '600', color: colors.muted },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    marginTop: spacing.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardStrip: { width: 6 },
  cardThumb: { width: 80, height: '100%', minHeight: 80 },
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
    paddingVertical: 5,
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
  compareBtnActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  price: { color: colors.accent, fontWeight: '700', fontSize: 13 },
  rating: { color: colors.text, fontWeight: '600', fontSize: 12 },
});
