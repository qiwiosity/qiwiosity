import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image, Dimensions, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { useData } from '../context/DataContext';
import { useItinerary } from '../context/ItineraryContext';
import { useCompare } from '../context/CompareContext';
import { useMyLists } from '../context/MyListsContext';
import { openDirectionsTo } from '../utils/directions';
import { colors, radius, spacing, type } from '../theme';
import ReviewsSection from '../components/ReviewsSection';
import SaveToListModal from '../components/SaveToListModal';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function AttractionDetailScreen({ route, navigation }) {
  const { attractions, categories, regions, getPoiImages } = useData();
  const { id } = route.params || {};
  const attraction = attractions.find((a) => a.id === id);
  const itinerary = useItinerary();
  const compare = useCompare();
  const myLists = useMyLists();
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  // Always call hooks before any early return to keep hook order stable.
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
  const inCompare = compare.has(attraction.id);
  const images = getPoiImages(attraction.id);
  const heroImage = images.length > 0 ? images[imageIndex % images.length] : null;

  const toggleCompare = () => {
    const added = compare.toggle(attraction);
    Alert.alert(added ? 'Added to compare list' : 'Removed from compare list');
  };

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
    // `push` lets us stack Detail → Detail → Detail even within the same navigator.
    navigation.push('AttractionDetail', { id: item.id });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Hero image with fallback to colour banner */}
      {heroImage && !imageError ? (
        <View style={styles.heroImageWrap}>
          <Image
            source={{ uri: heroImage }}
            style={styles.heroImage}
            resizeMode="cover"
            onLoadStart={() => setImageLoading(true)}
            onLoadEnd={() => setImageLoading(false)}
            onError={() => { setImageError(true); setImageLoading(false); }}
          />
          {imageLoading && (
            <View style={styles.heroImageOverlay}>
              <ActivityIndicator color="white" size="small" />
            </View>
          )}
          <View style={styles.heroImageGradient}>
            <Text style={styles.heroLabel}>{cat?.label}</Text>
            <Text style={styles.heroTitle}>{attraction.name}</Text>
            <Text style={styles.heroMeta}>
              {region?.name} · {attraction.duration_hours}h suggested
            </Text>
          </View>
          {images.length > 1 && (
            <View style={styles.imageNav}>
              <TouchableOpacity
                style={styles.imageNavBtn}
                onPress={() => { setImageIndex((i) => (i - 1 + images.length) % images.length); setImageError(false); }}
              >
                <Ionicons name="chevron-back" size={18} color="white" />
              </TouchableOpacity>
              <Text style={styles.imageCounter}>{(imageIndex % images.length) + 1}/{images.length}</Text>
              <TouchableOpacity
                style={styles.imageNavBtn}
                onPress={() => { setImageIndex((i) => (i + 1) % images.length); setImageError(false); }}
              >
                <Ionicons name="chevron-forward" size={18} color="white" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      ) : (
        <View style={[styles.hero, { backgroundColor: cat?.color || colors.primary }]}>
          <Text style={styles.heroLabel}>{cat?.label}</Text>
          <Text style={styles.heroTitle}>{attraction.name}</Text>
          <Text style={styles.heroMeta}>
            {region?.name} · {attraction.duration_hours}h suggested
          </Text>
        </View>
      )}

      <View style={styles.body}>
        <Text style={type.body}>{attraction.short}</Text>

        <View style={styles.commentaryBox}>
          <Text style={styles.commentaryLabel}>🎧 TOUR GUIDE</Text>
          <Text style={styles.commentaryText}>{attraction.commentary}</Text>
          <TouchableOpacity style={styles.listenBtn} onPress={listen}>
            <Text style={styles.listenBtnText}>▶ Listen</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tagRow}>
          {(attraction.tags || []).map((t) => (
            <View key={t} style={styles.tag}><Text style={styles.tagText}>#{t}</Text></View>
          ))}
        </View>

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
          <TouchableOpacity
            style={[styles.quickAction, inCompare && { borderColor: colors.accent, backgroundColor: 'rgba(224,123,60,0.08)' }]}
            onPress={toggleCompare}
            activeOpacity={0.85}
          >
            <Ionicons name="git-compare-outline" size={18} color={inCompare ? colors.accent : colors.primary} />
            <Text style={[styles.quickActionText, inCompare && { color: colors.accent }]}>
              {inCompare ? 'Comparing' : 'Compare'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.quickAction,
              myLists.isInAnyList(attraction.id) && { borderColor: colors.accent, backgroundColor: 'rgba(224,123,60,0.08)' },
            ]}
            onPress={() => setShowSaveModal(true)}
            activeOpacity={0.85}
          >
            <Ionicons
              name={myLists.isInAnyList(attraction.id) ? 'bookmark' : 'bookmark-outline'}
              size={18}
              color={myLists.isInAnyList(attraction.id) ? colors.accent : colors.primary}
            />
            <Text style={[styles.quickActionText, myLists.isInAnyList(attraction.id) && { color: colors.accent }]}>
              {myLists.isInAnyList(attraction.id) ? 'Saved' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.cta, inItin ? styles.ctaRemove : styles.ctaAdd]}
          onPress={toggle}
        >
          <Text style={styles.ctaText}>{inItin ? 'Remove from itinerary' : '+ Add to itinerary'}</Text>
        </TouchableOpacity>

        {/* Visitor Reviews — AI overview + rating (static, from content JSON) */}
        <ReviewsSection poi={attraction} />

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
                const itemImages = getPoiImages(item.id);
                const thumb = itemImages.length > 0 ? itemImages[0] : null;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.similarCard}
                    activeOpacity={0.85}
                    onPress={() => handleSimilarPress(item)}
                  >
                    {thumb ? (
                      <Image source={{ uri: thumb }} style={styles.similarThumb} resizeMode="cover" />
                    ) : (
                      <View style={[styles.similarThumb, { backgroundColor: itemCat?.color || colors.primary }]}>
                        <Ionicons name="image-outline" size={20} color="rgba(255,255,255,0.6)" />
                      </View>
                    )}
                    <View style={{ padding: spacing.md }}>
                      <Text style={styles.similarName} numberOfLines={2}>
                        {item.name}
                      </Text>
                      <Text style={type.caption} numberOfLines={1}>
                        {itemRegion?.name}
                      </Text>
                      <Text style={[type.body, { marginTop: 6 }]} numberOfLines={3}>
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

      {/* Save to list modal */}
      <SaveToListModal
        visible={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        poi={attraction}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  // Image hero
  heroImageWrap: { width: SCREEN_WIDTH, height: 260, backgroundColor: '#222' },
  heroImage: { width: '100%', height: '100%' },
  heroImageOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  heroImageGradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: spacing.xl, paddingBottom: spacing.lg, paddingTop: 50,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  imageNav: {
    position: 'absolute', top: spacing.md, right: spacing.md,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: radius.pill,
    paddingHorizontal: 6, paddingVertical: 3,
  },
  imageNavBtn: { padding: 4 },
  imageCounter: { color: 'white', fontSize: 11, fontWeight: '700' },
  // Colour-only hero (fallback)
  hero: { padding: spacing.xl, paddingBottom: spacing.xxl },
  heroLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, letterSpacing: 1.5, fontWeight: '700' },
  heroTitle: { color: 'white', fontSize: 26, fontWeight: '700', marginTop: 4 },
  heroMeta: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 6 },
  body: { padding: spacing.lg },
  commentaryBox: {
    backgroundColor: '#FAF7F0',
    padding: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  commentaryLabel: { fontSize: 10, color: colors.muted, fontWeight: '700', letterSpacing: 1.2 },
  commentaryText: { ...type.body, marginTop: spacing.sm, lineHeight: 21, fontStyle: 'italic', color: '#5a4530' },
  listenBtn: { alignSelf: 'flex-start', marginTop: spacing.md, backgroundColor: colors.primary, paddingVertical: 8, paddingHorizontal: 16, borderRadius: radius.pill },
  listenBtnText: { color: 'white', fontWeight: '600' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.lg },
  tag: { backgroundColor: colors.surface, borderRadius: radius.pill, paddingVertical: 4, paddingHorizontal: 10, marginRight: 6, marginBottom: 6, borderWidth: 1, borderColor: colors.border },
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
  cta: { marginTop: spacing.md, paddingVertical: 14, borderRadius: radius.md, alignItems: 'center' },
  ctaAdd: { backgroundColor: colors.primary },
  ctaRemove: { backgroundColor: colors.danger },
  ctaText: { color: 'white', fontWeight: '700', fontSize: 15 },
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
  similarThumb: { width: '100%', height: 100, alignItems: 'center', justifyContent: 'center' },
  similarName: { ...type.heading, fontSize: 15 },
});
