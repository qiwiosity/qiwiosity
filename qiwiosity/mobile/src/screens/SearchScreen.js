import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../context/DataContext';
import { useItinerary } from '../context/ItineraryContext';
import { useCompare } from '../context/CompareContext';
import { colors, radius, spacing, type } from '../theme';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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

export default function SearchScreen({ navigation }) {
  const { attractions, accommodations, regions, categories, getPoiImages } = useData();
  const { add, addAccommodation, has, remove } = useItinerary();
  const compare = useCompare();
  const [query, setQuery] = useState('');
  const [groupBy, setGroupBy] = useState('region');
  const [expanded, setExpanded] = useState({}); // track which sections are expanded

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
          sortOrder = 100;
        } else {
          // Merge wildlife into nature
          const effectiveCat = item.category === 'wildlife' ? 'nature' : item.category;
          key = effectiveCat;
          label = categories.find((c) => c.id === effectiveCat)?.label || effectiveCat;
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

  const toggleSection = useCallback((key) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

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

  const handleTrip = (item) => {
    if (has(item.id)) {
      remove(item.id);
    } else if (item.itemType === 'accommodation') {
      addAccommodation(item);
    } else {
      add(item);
    }
  };

  const totalCount = filtered.length;

  const renderItem = (item) => {
    const catInfo = getCatInfo(item);
    const region = regions.find((r) => r.id === item.region);
    const inTrip = has(item.id);
    const inCompare = item.itemType !== 'accommodation' ? compare.has(item.id) : false;
    const images = item.itemType === 'poi' ? getPoiImages(item.id) : [];
    const thumb = images.length > 0 ? images[0] : null;

    return (
      <TouchableOpacity
        key={item.id}
        style={styles.card}
        onPress={() => handlePress(item)}
        onLongPress={() => handlePress(item)}
        delayLongPress={400}
        activeOpacity={0.7}
      >
        {/* Thumbnail image */}
        {thumb ? (
          <Image source={{ uri: thumb }} style={styles.cardThumb} resizeMode="cover" />
        ) : (
          <View style={[styles.cardThumb, styles.cardThumbPlaceholder, { backgroundColor: catInfo.color }]}>
            <Ionicons name="image-outline" size={18} color="rgba(255,255,255,0.7)" />
          </View>
        )}
        <View style={styles.cardBody}>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.cardCaption}>
                {region?.name?.split(' / ')[0] || item.region}
                {item.duration_hours ? ` · ${item.duration_hours}h` : ''}
                {' · '}{catInfo.label}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {item.itemType !== 'accommodation' && (
                <TouchableOpacity
                  style={[styles.actionChip, inCompare && styles.actionChipCompareActive]}
                  onPress={() => compare.toggle(item)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={inCompare ? 'checkmark-circle' : 'git-compare-outline'}
                    size={14}
                    color={inCompare ? '#fff' : colors.primary}
                  />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.actionChip, inTrip && styles.actionChipTripActive]}
                onPress={() => handleTrip(item)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={inTrip ? 'checkmark-circle' : 'add-circle-outline'}
                  size={14}
                  color={inTrip ? '#fff' : colors.primary}
                />
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.cardDesc} numberOfLines={2}>{item.short}</Text>
          {item.itemType === 'accommodation' && item.price_nzd_per_night && (
            <Text style={styles.cardPrice}>
              NZ${item.price_nzd_per_night}/night
              {item.rating != null ? `  ★ ${item.rating.toFixed(1)}` : ''}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={colors.muted} />
        <TextInput
          style={styles.search}
          placeholder="Search New Zealand..."
          placeholderTextColor={colors.muted}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {!!query && (
          <TouchableOpacity onPress={() => setQuery('')} hitSlop={10}>
            <Ionicons name="close-circle" size={18} color={colors.muted} />
          </TouchableOpacity>
        )}
      </View>

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
              onPress={() => {
                setGroupBy(g.id);
                setExpanded({}); // collapse all when switching group
              }}
            >
              <Text style={[styles.groupChipText, groupBy === g.id && styles.groupChipTextActive]}>
                {g.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Collapsible sections */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: spacing.xxl }}
      >
        {sections.map((section) => {
          const isExpanded = !!expanded[section.key];
          return (
            <View key={section.key} style={styles.section}>
              {/* Section header — tap to expand/collapse */}
              <TouchableOpacity
                style={styles.sectionHeader}
                onPress={() => toggleSection(section.key)}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                  <Text style={styles.sectionCount}>
                    {section.data.length} place{section.data.length !== 1 ? 's' : ''}
                  </Text>
                </View>
                <Ionicons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={colors.muted}
                />
              </TouchableOpacity>

              {/* Section items — only shown when expanded */}
              {isExpanded && (
                <View style={styles.sectionItems}>
                  {section.data.map((item) => renderItem(item))}
                </View>
              )}
            </View>
          );
        })}

        {sections.length === 0 && (
          <Text style={[type.caption, { textAlign: 'center', padding: spacing.xl }]}>
            No places match your search.
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  searchWrap: {
    margin: spacing.md,
    marginBottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  search: { flex: 1, fontSize: 15, color: colors.text, padding: 0 },
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
  section: {
    marginTop: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  sectionCount: { fontSize: 11, color: colors.muted, marginTop: 1 },
  sectionItems: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.bg,
    borderRadius: radius.sm,
    marginTop: spacing.xs,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardThumb: {
    width: 70,
    height: 70,
  },
  cardThumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  cardBody: { flex: 1, padding: spacing.sm },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  cardTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  cardCaption: { fontSize: 11, color: colors.muted, marginTop: 1 },
  cardDesc: { fontSize: 12, color: colors.text, marginTop: 4 },
  cardPrice: { fontSize: 12, color: colors.accent, fontWeight: '700', marginTop: 4 },
  actionChip: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  actionChipTripActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  actionChipCompareActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
});
