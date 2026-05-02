import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import accommodations from '../data/accommodations.json';
import regions from '../data/regions.json';
import { getAccommodationImage } from '../utils/getPoiImage';
import { colors, radius, spacing, type } from '../theme';

const TYPES = [
  { id: 'all', label: 'All' },
  { id: 'luxury-hotel', label: 'Luxury Hotel' },
  { id: 'luxury-lodge', label: 'Luxury Lodge' },
  { id: 'boutique', label: 'Boutique' },
  { id: 'hotel', label: 'Hotel' },
  { id: 'vacation-rental', label: 'Rental' },
  { id: 'holiday-park', label: 'Holiday Park' },
  { id: 'hostel', label: 'Hostel' },
  { id: 'doc-hut', label: 'DOC Hut' },
];

// Star rating helper — fills stars up to 5
function StarRating({ rating }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Ionicons
          key={i}
          name={i < full ? 'star' : i === full && half ? 'star-half' : 'star-outline'}
          size={11}
          color="#E07B3C"
        />
      ))}
      <Text style={{ fontSize: 11, color: colors.muted, marginLeft: 4 }}>
        {rating.toFixed(1)}
      </Text>
    </View>
  );
}

export default function AccommodationsScreen() {
  const [filter, setFilter] = useState('all');
  const visible = useMemo(
    () =>
      filter === 'all'
        ? accommodations
        : accommodations.filter((a) => a.type === filter),
    [filter]
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={type.title}>Where to Stay</Text>
        <Text style={[type.caption, { marginTop: 4 }]}>
          {accommodations.length} curated places across New Zealand
        </Text>
      </View>

      {/* Type filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        {TYPES.map((t) => (
          <TouchableOpacity
            key={t.id}
            onPress={() => setFilter(t.id)}
            style={[styles.chip, filter === t.id && styles.chipOn]}
          >
            <Text style={[styles.chipText, filter === t.id && { color: 'white' }]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* List */}
      <FlatList
        data={visible}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: spacing.md }}
        renderItem={({ item }) => {
          const region = regions.find((r) => r.id === item.region);
          const imageUri = getAccommodationImage(item);

          return (
            <View style={styles.card}>
              {/* Hero landscape image */}
              <View style={styles.imageWrap}>
                <Image
                  source={{ uri: imageUri }}
                  style={styles.image}
                  resizeMode="cover"
                />
                {/* Property type badge */}
                <View style={styles.typeBadge}>
                  <Text style={styles.typeBadgeText}>
                    {item.type?.replace(/-/g, ' ') || 'Hotel'}
                  </Text>
                </View>
                {/* Price chip in bottom right */}
                <View style={styles.priceBadge}>
                  <Text style={styles.priceText}>
                    NZ${item.price_nzd_per_night}
                    <Text style={{ fontSize: 10, fontWeight: '400' }}>/night</Text>
                  </Text>
                </View>
              </View>

              {/* Text body */}
              <View style={styles.body}>
                <Text style={type.heading} numberOfLines={1}>{item.name}</Text>
                <Text style={[type.caption, { marginTop: 2 }]}>
                  {region?.name}
                </Text>

                <StarRating rating={item.rating} />

                <Text style={[type.body, { marginTop: 8 }]} numberOfLines={2}>
                  {item.short}
                </Text>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingTop: 50,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  chips: {
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
  chipOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: { ...type.caption, color: colors.text, fontWeight: '600' },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  imageWrap: {
    height: 150,
    position: 'relative',
    backgroundColor: colors.border,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  typeBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: radius.pill,
  },
  typeBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  priceBadge: {
    position: 'absolute',
    bottom: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.accent,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
  },
  priceText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '700',
  },
  body: {
    padding: spacing.md,
  },
});
