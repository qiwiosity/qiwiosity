import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Alert,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import attractions from '../data/attractions.json';
import categories from '../data/categories.json';
import regions from '../data/regions.json';
import { useItinerary } from '../context/ItineraryContext';
import { openDirectionsTo } from '../utils/directions';
import { getAttractionImage, getAttractionImages } from '../utils/getPoiImage';
import { colors, radius, spacing, type } from '../theme';

const { width: SCREEN_W } = Dimensions.get('window');
const HERO_HEIGHT = 300;

/* Star rating helper */
function StarRating({ rating }) {
  if (!rating) return null;
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 6 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Ionicons
          key={i}
          name={i < full ? 'star' : i === full && half ? 'star-half' : 'star-outline'}
          size={14}
          color="#E07B3C"
        />
      ))}
      <Text style={{ fontSize: 13, color: colors.muted, marginLeft: 5, fontWeight: '600' }}>
        {rating.toFixed(1)}
      </Text>
    </View>
  );
}

/* ── Photo Gallery ────────────────────────────────────────────────── */
function PhotoGallery({ images, accentColor }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatRef = useRef(null);

  const onScroll = (e) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    setActiveIndex(idx);
  };

  return (
    <View style={{ height: HERO_HEIGHT }}>
      <FlatList
        ref={flatRef}
        data={images}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <View style={{ width: SCREEN_W, height: HERO_HEIGHT }}>
            <Image
              source={{ uri: item }}
              style={{ width: SCREEN_W, height: HERO_HEIGHT }}
              resizeMode="cover"
            />
            {/* Dark gradient overlay */}
            <View style={styles.heroOverlay} />
          </View>
        )}
      />

      {/* Wikimedia attribution */}
      <Text style={styles.heroCredit}>📷 Wikimedia Commons</Text>

      {/* Dot indicators — only show if multiple images */}
      {images.length > 1 && (
        <View style={styles.dotsRow}>
          {images.map((_, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => {
                flatRef.current?.scrollToIndex({ index: i, animated: true });
                setActiveIndex(i);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            >
              <View
                style={[
                  styles.dot,
                  i === activeIndex
                    ? { backgroundColor: 'white', width: 18 }
                    : { backgroundColor: 'rgba(255,255,255,0.45)', width: 7 },
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Image counter badge */}
      {images.length > 1 && (
        <View style={styles.counterBadge}>
          <Ionicons name="images-outline" size={11} color="white" style={{ marginRight: 3 }} />
          <Text style={styles.counterText}>
            {activeIndex + 1}/{images.length}
          </Text>
        </View>
      )}
    </View>
  );
}

/* ── Main screen ──────────────────────────────────────────────────── */
export default function AttractionDetailScreen({ route, navigation }) {
  const { id } = route.params || {};
  const attraction = attractions.find((a) => a.id === id);
  const itinerary = useItinerary();

  const similar = useMemo(() => {
    if (!attraction) return [];
    return attractions
      .filter((a) => a.id !== attraction.id && a.category === attraction.category)
      .slice(0, 6);
  }, [attraction]);

  if (!attraction) {
    return (
      <View style={styles.container}>
        <Text style={type.body}>Attraction not found.</Text>
      </View>
    );
  }

  const cat = categories.find((c) => c.id === attraction.category);
  const region = regions.find((r) => r.id === attraction.region);
  const inItin = itinerary.has(attraction.id);
  const heroImages = getAttractionImages(attraction);
  const accentColor = cat?.color || colors.primary;

  const listen = () => {
    Speech.stop();
    Speech.speak(`${attraction.name}. ${attraction.commentary}`, { rate: 0.95, pitch: 1 });
  };

  const toggle = () => {
    if (inItin) {
      itinerary.remove(attraction.id);
      Alert.alert('Removed from itinerary');
    } else {
      itinerary.add(attraction);
      Alert.alert('Added to your itinerary');
    }
  };

  const handleSimilarPress = (item) => {
    navigation.push('AttractionDetail', { id: item.id });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>

      {/* ── Swipeable photo gallery ── */}
      <PhotoGallery images={heroImages} accentColor={accentColor} />

      {/* ── Title block below gallery ── */}
      <View style={[styles.titleBlock, { borderLeftColor: accentColor }]}>
        <View style={[styles.catChip, { backgroundColor: accentColor }]}>
          <Text style={styles.catChipText}>{cat?.label || attraction.category}</Text>
        </View>
        <Text style={styles.heroTitle}>{attraction.name}</Text>
        <Text style={styles.heroMeta}>
          {region?.name}{'  ·  '}{attraction.duration_hours}h suggested
        </Text>
        {attraction.reviews?.rating && (
          <StarRating rating={attraction.reviews.rating} />
        )}
      </View>

      {/* ── Body ── */}
      <View style={styles.body}>
        <Text style={[type.body, { lineHeight: 22 }]}>{attraction.short}</Text>

        {/* Tour guide commentary box */}
        <View style={styles.commentaryBox}>
          <Text style={styles.commentaryLabel}>🎧  TOUR GUIDE</Text>
          <Text style={styles.commentaryText}>{attraction.commentary}</Text>
          <TouchableOpacity
            style={[styles.listenBtn, { backgroundColor: accentColor }]}
            onPress={listen}
          >
            <Ionicons name="play" size={14} color="white" />
            <Text style={styles.listenBtnText}>Listen</Text>
          </TouchableOpacity>
        </View>

        {/* AI Review Summary */}
        {attraction.reviews?.summary && (
          <View style={styles.reviewBox}>
            <View style={styles.reviewHeader}>
              <Ionicons name="chatbubbles-outline" size={14} color={accentColor} />
              <Text style={[styles.reviewLabel, { color: accentColor }]}>AI REVIEW SUMMARY</Text>
            </View>
            {attraction.reviews?.rating && (
              <StarRating rating={attraction.reviews.rating} />
            )}
            <Text style={styles.reviewText}>{attraction.reviews.summary}</Text>
          </View>
        )}

        {/* Tags */}
        <View style={styles.tagRow}>
          {(attraction.tags || []).map((t) => (
            <View key={t} style={styles.tag}>
              <Text style={styles.tagText}>#{t}</Text>
            </View>
          ))}
        </View>

        {/* Quick actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => openDirectionsTo(attraction)}
            activeOpacity={0.85}
          >
            <Ionicons name="navigate" size={18} color={colors.primary} />
            <Text style={styles.quickActionText}>Directions</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={listen}
            activeOpacity={0.85}
          >
            <Ionicons name="headset" size={18} color={colors.primary} />
            <Text style={styles.quickActionText}>Listen</Text>
          </TouchableOpacity>
        </View>

        {/* Add / remove from itinerary */}
        <TouchableOpacity
          style={[styles.cta, inItin ? styles.ctaRemove : styles.ctaAdd]}
          onPress={toggle}
        >
          <Ionicons
            name={inItin ? 'remove-circle-outline' : 'add-circle-outline'}
            size={18}
            color="white"
            style={{ marginRight: 6 }}
          />
          <Text style={styles.ctaText}>
            {inItin ? 'Remove from itinerary' : 'Add to itinerary'}
          </Text>
        </TouchableOpacity>

        {/* Similar attractions */}
        {similar.length > 0 && (
          <View style={styles.similarSection}>
            <Text style={styles.similarTitle}>✨ More like this</Text>
            <Text style={type.caption}>
              Other {cat?.label?.toLowerCase() || 'similar'} places you might enjoy
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingVertical: spacing.md, gap: spacing.sm }}
            >
              {similar.map((item) => {
                const itemCat = categories.find((c) => c.id === item.category);
                const itemRegion = regions.find((r) => r.id === item.region);
                const itemImage = getAttractionImage(item);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.similarCard}
                    activeOpacity={0.85}
                    onPress={() => handleSimilarPress(item)}
                  >
                    <Image
                      source={{ uri: itemImage }}
                      style={styles.similarImage}
                      resizeMode="cover"
                    />
                    <View
                      style={[
                        styles.similarColorBar,
                        { backgroundColor: itemCat?.color || colors.primary },
                      ]}
                    />
                    <View style={styles.similarBody}>
                      <Text style={styles.similarName} numberOfLines={2}>
                        {item.name}
                      </Text>
                      <Text style={type.caption} numberOfLines={1}>
                        {itemRegion?.name}
                      </Text>
                      <Text style={[type.body, { marginTop: 4, fontSize: 12 }]} numberOfLines={3}>
                        {item.short}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  /* Gallery overlay elements */
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  heroCredit: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    fontSize: 9,
    color: 'rgba(255,255,255,0.65)',
    fontStyle: 'italic',
  },
  dotsRow: {
    position: 'absolute',
    bottom: spacing.md,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    height: 7,
    borderRadius: 4,
  },
  counterBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.45)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: radius.pill,
  },
  counterText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },

  /* Title block */
  titleBlock: {
    padding: spacing.lg,
    paddingTop: spacing.md,
    borderLeftWidth: 4,
    marginLeft: spacing.lg,
    marginRight: spacing.lg,
    marginTop: spacing.md,
    borderRadius: 2,
  },
  catChip: {
    alignSelf: 'flex-start',
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    marginBottom: spacing.xs,
  },
  catChipText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    marginTop: 4,
  },
  heroMeta: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 5,
  },

  // Body
  body: { padding: spacing.lg, paddingTop: spacing.sm },
  commentaryBox: {
    backgroundColor: '#FAF7F0',
    padding: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  commentaryLabel: {
    fontSize: 10,
    color: colors.muted,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  commentaryText: {
    ...type.body,
    marginTop: spacing.sm,
    lineHeight: 21,
    fontStyle: 'italic',
    color: '#5a4530',
  },
  listenBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: spacing.md,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
  },
  listenBtnText: { color: 'white', fontWeight: '600', fontSize: 13 },
  reviewBox: {
    backgroundColor: '#F0F5FA',
    padding: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: '#D4E2F0',
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reviewLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  reviewText: {
    ...type.body,
    marginTop: spacing.sm,
    lineHeight: 21,
    color: '#3A4F65',
  },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.lg, gap: 6 },
  tag: {
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagText: { ...type.caption },
  quickActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
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
  cta: {
    marginTop: spacing.md,
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  ctaAdd: { backgroundColor: colors.primary },
  ctaRemove: { backgroundColor: colors.danger },
  ctaText: { color: 'white', fontWeight: '700', fontSize: 15 },

  // Similar cards
  similarSection: { marginTop: spacing.xxl },
  similarTitle: { ...type.heading, marginBottom: 2 },
  similarCard: {
    width: 200,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  similarImage: {
    width: '100%',
    height: 110,
  },
  similarColorBar: {
    height: 3,
  },
  similarBody: {
    padding: spacing.sm,
  },
  similarName: { ...type.heading, fontSize: 13 },
});
