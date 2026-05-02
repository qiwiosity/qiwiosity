import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TextInput,
  TouchableOpacity,
  Image,
} from 'react-native';
import attractions from '../data/attractions.json';
import regions from '../data/regions.json';
import categories from '../data/categories.json';
import { getAttractionImage } from '../utils/getPoiImage';
import { colors, radius, spacing, type } from '../theme';

/* ── Pre-compute lookup maps once at module level ─────────────────── */
const catMap = Object.fromEntries(categories.map((c) => [c.id, c]));
const regionMap = Object.fromEntries(regions.map((r) => [r.id, r]));

/* Region ordering: North Island first, then South, alphabetical within each */
const regionOrder = Object.fromEntries(
  [...regions].sort((a, b) => {
    if (a.island !== b.island) return a.island === 'North' ? -1 : 1;
    return a.name.localeCompare(b.name);
  }).map((r, i) => [r.id, i])
);

/* ── Debounce hook ────────────────────────────────────────────────── */
function useDebouncedValue(value, delayMs = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

/* ── Card heights for getItemLayout ───────────────────────────────── */
const IMAGE_H = 160;
const BODY_EST = 110;            // body padding + text lines (approx)
const CARD_MB = spacing.md;      // marginBottom on each card
const ITEM_HEIGHT = IMAGE_H + BODY_EST + CARD_MB;
const SECTION_HEADER_H = 38;     // region banner height

/* ── Memoised card component ──────────────────────────────────────── */
const AttractionCard = React.memo(function AttractionCard({ item, onPress }) {
  const cat = catMap[item.category];
  const region = regionMap[item.region];
  const imageUri = getAttractionImage(item);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.88}>
      {/* Hero photo */}
      <View style={styles.imageWrap}>
        <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
        <View style={[styles.catPill, { backgroundColor: cat?.color || colors.primary }]}>
          <Text style={styles.catPillText}>{cat?.label || item.category}</Text>
        </View>
      </View>

      {/* Text body */}
      <View style={styles.body}>
        <Text style={type.heading} numberOfLines={1}>{item.name}</Text>
        <Text style={[type.caption, { marginTop: 2 }]}>
          {region?.name} · {item.duration_hours}h
        </Text>
        <Text style={[type.body, { marginTop: 6 }]} numberOfLines={2}>
          {item.short}
        </Text>

        {item.tags && item.tags.length > 0 && (
          <View style={styles.tagRow}>
            {item.tags.slice(0, 3).map((t) => (
              <View key={t} style={styles.tag}>
                <Text style={styles.tagText}>#{t}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
});

/* ── Main screen ──────────────────────────────────────────────────── */
export default function AttractionsScreen({ navigation }) {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 300);

  /* Build SectionList sections grouped by region */
  const sections = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    const list = q
      ? attractions.filter(
          (a) =>
            a.name.toLowerCase().includes(q) ||
            a.short.toLowerCase().includes(q) ||
            (a.tags || []).some((t) => t.toLowerCase().includes(q))
        )
      : attractions;

    // Group by region
    const groups = {};
    for (const a of list) {
      (groups[a.region] ||= []).push(a);
    }

    return Object.entries(groups)
      .sort(([a], [b]) => (regionOrder[a] ?? 99) - (regionOrder[b] ?? 99))
      .map(([regionId, data]) => ({
        title: regionMap[regionId]?.name || regionId,
        data,
      }));
  }, [debouncedQuery]);

  /* Stable press handler factory */
  const handlePress = useCallback(
    (id) => navigation.navigate('AttractionDetail', { id }),
    [navigation]
  );

  const renderItem = useCallback(
    ({ item }) => (
      <AttractionCard item={item} onPress={() => handlePress(item.id)} />
    ),
    [handlePress]
  );

  const renderSectionHeader = useCallback(
    ({ section: { title } }) => (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionHeaderText}>{title}</Text>
      </View>
    ),
    []
  );

  const keyExtractor = useCallback((item) => item.id, []);

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        placeholder="Search attractions, tags, regions…"
        placeholderTextColor={colors.muted}
        value={query}
        onChangeText={setQuery}
      />
      <SectionList
        sections={sections}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        contentContainerStyle={{ padding: spacing.md }}
        stickySectionHeadersEnabled
        /* ── Virtualisation tuning ── */
        initialNumToRender={8}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews
        getItemLayout={(data, index) => ({
          length: ITEM_HEIGHT,
          offset: ITEM_HEIGHT * index,
          index,
        })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  search: {
    margin: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 14,
    color: colors.text,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    // soft shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  imageWrap: {
    height: 160,
    position: 'relative',
    backgroundColor: colors.border,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  catPill: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: radius.pill,
  },
  catPillText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  body: {
    padding: spacing.md,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
    gap: 4,
  },
  tag: {
    backgroundColor: colors.bg,
    borderRadius: radius.pill,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagText: {
    fontSize: 10,
    color: colors.muted,
    fontWeight: '500',
  },
  sectionHeader: {
    height: SECTION_HEADER_H,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
});
