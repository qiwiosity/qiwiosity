import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  LayoutAnimation,
  Platform,
  UIManager,
  Image,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../context/DataContext';
import { useCompare } from '../context/CompareContext';
import { openDirectionsTo } from '../utils/directions';
import { colors, radius, spacing, type } from '../theme';
import SaveToListModal from '../components/SaveToListModal';
import SnapIdentifyModal from '../components/SnapIdentifyModal';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const NZ_REGION = { latitude: -41.0, longitude: 173.5, latitudeDelta: 15, longitudeDelta: 15 };

// Map each category to a unique Ionicons icon for the map marker
const CATEGORY_ICONS = {
  adventure: { icon: 'flash', color: '#E65100' },
  culture: { icon: 'color-palette', color: '#2C6FAD' },
  'food-wine': { icon: 'wine', color: '#B71C1C' },
  heritage: { icon: 'library', color: '#4527A0' },
  journey: { icon: 'car', color: '#37474F' },
  'māori': { icon: 'bonfire', color: '#C0392B' },
  nature: { icon: 'leaf', color: '#2E7D32' },
  accommodation: { icon: 'bed', color: '#5D4037' },
};

// Accommodation sub-types for marker coloring
const ACCOM_TYPE_COLORS = {
  hotel: '#1565C0',
  motel: '#EF6C00',
  'holiday-park': '#2E7D32',
  lodge: '#6A1B9A',
};

// The "Accommodation" virtual category definition
const ACCOMMODATION_CATEGORY = {
  id: 'accommodation',
  label: 'Accommodation',
  icon: 'bed',
  color: '#5D4037',
};

export default function MapScreen({ navigation }) {
  const { attractions, categories, accommodations, regions, getPoiImages, getPoiCategory } = useData();
  const compare = useCompare();

  // Build a combined category list that includes accommodation, sorted alphabetically
  // Filter out 'wildlife' since it's merged into 'nature'
  const allCategories = useMemo(
    () => [...categories.filter((c) => c.id !== 'wildlife'), ACCOMMODATION_CATEGORY].sort((a, b) => a.label.localeCompare(b.label)),
    [categories]
  );

  // All categories ON by default
  const [active, setActive] = useState(new Set(allCategories.map((c) => c.id)));
  const [userToggled, setUserToggled] = useState(false);
  const [selected, setSelected] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [saveModalPoi, setSaveModalPoi] = useState(null);
  const [filterVisible, setFilterVisible] = useState(false); // collapsed by default
  const [imageError, setImageError] = useState(false);
  const [showSnap, setShowSnap] = useState(false);

  // Re-initialize active categories when data loads (categories is empty on first render)
  useEffect(() => {
    if (!userToggled && allCategories.length > 0) {
      setActive(new Set(allCategories.map((c) => c.id)));
    }
  }, [allCategories]);

  // Reset image error when selection changes
  useEffect(() => {
    setImageError(false);
  }, [selected]);

  // Visible attractions (filtered by active categories)
  // 'wildlife' POIs are now merged into 'nature' category
  const visibleAttractions = useMemo(
    () => attractions.filter((a) => {
      const cat = a.category === 'wildlife' ? 'nature' : a.category;
      return active.has(cat);
    }),
    [active, attractions]
  );

  // Visible accommodations
  const visibleAccommodations = useMemo(() => {
    if (!active.has('accommodation')) return [];
    return accommodations;
  }, [active, accommodations]);

  const toggleCategory = (id) => {
    setUserToggled(true);
    const next = new Set(active);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setActive(next);
  };

  const toggleFilterMenu = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setFilterVisible(!filterVisible);
  };

  // Navigate to full detail screen
  const goToDetail = (item, itemType) => {
    if (itemType === 'accommodation') {
      navigation.navigate('AccommodationDetail', { id: item.id });
    } else {
      navigation.navigate('AttractionDetail', { id: item.id });
    }
  };

  const handleMarkerPress = (item, itemType) => {
    setSelected(item);
    setSelectedType(itemType);
  };

  const openDetails = () => {
    if (!selected) return;
    goToDetail(selected, selectedType);
  };

  const driveTo = () => {
    if (!selected) return;
    openDirectionsTo(selected);
  };

  const toggleCompare = () => {
    if (!selected) return;
    compare.toggle(selected);
  };

  // Get images for the selected POI/accommodation (for the action card preview)
  const selectedImages = useMemo(() => {
    if (!selected) return [];
    // Try to get images for any selected item (POI or accommodation)
    const imgs = getPoiImages(selected.id);
    // For accommodations, also check if there's an image_url field on the item itself
    if (imgs.length === 0 && selected.image_url) {
      return [selected.image_url];
    }
    return imgs;
  }, [selected, getPoiImages]);

  const isInCompare = useMemo(() => {
    if (!selected) return false;
    return compare.has(selected.id);
  }, [selected, compare]);

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={NZ_REGION}
        onPress={(e) => {
          // Check if the click is on a marker by inspecting the event target or action.
          // Some versions of react-native-maps bubble marker presses to the map.
          const isMapPress = !e.nativeEvent.action || e.nativeEvent.action === 'press';
          
          if (isMapPress) {
            // Only clear selection if we're sure it's a background map tap
            setSelected(null);
            setSelectedType(null);
          }
          
          if (filterVisible) {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setFilterVisible(false);
          }
        }}
      >
        {/* Attraction markers — each category gets a unique icon */}
        {visibleAttractions.map((a) => {
          const effectiveCat = a.category === 'wildlife' ? 'nature' : a.category;
          const catInfo = CATEGORY_ICONS[effectiveCat] || { icon: 'location', color: colors.primary };
          return (
            <Marker
              key={`poi-${a.id}`}
              coordinate={{ latitude: a.lat, longitude: a.lng }}
              onPress={(e) => {
                e.stopPropagation();
                handleMarkerPress(a, 'poi');
              }}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={[styles.catMarker, { backgroundColor: catInfo.color }]}>
                <Ionicons name={catInfo.icon} size={14} color="white" />
              </View>
            </Marker>
          );
        })}

        {/* Accommodation markers */}
        {visibleAccommodations.map((a) => (
          <Marker
            key={`accom-${a.id}`}
            coordinate={{ latitude: a.lat, longitude: a.lng }}
            onPress={(e) => {
              e.stopPropagation();
              handleMarkerPress(a, 'accommodation');
            }}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={[styles.catMarker, { backgroundColor: ACCOM_TYPE_COLORS[a.type] || ACCOMMODATION_CATEGORY.color }]}>
              <Ionicons name="bed" size={14} color="white" />
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Snap & Identify FAB */}
      <TouchableOpacity
        style={styles.snapFab}
        onPress={() => setShowSnap(true)}
        activeOpacity={0.85}
      >
        <Ionicons name="camera" size={22} color="white" />
      </TouchableOpacity>

      {/* Filter toggle button — just the icon, no count */}
      <TouchableOpacity
        style={[styles.filterToggle, filterVisible && styles.filterToggleActive]}
        onPress={toggleFilterMenu}
        activeOpacity={0.8}
      >
        <Ionicons
          name={filterVisible ? 'close' : 'options'}
          size={20}
          color={filterVisible ? '#fff' : colors.primary}
        />
      </TouchableOpacity>

      {/* Collapsible filter list */}
      {filterVisible && (
        <View style={styles.filterPanel}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: spacing.sm }}
          >
            {allCategories.map((c) => {
              const on = active.has(c.id);
              const catIcon = CATEGORY_ICONS[c.id] || { icon: 'location', color: c.color };
              return (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => toggleCategory(c.id)}
                  style={[styles.filterItem, on && { backgroundColor: c.color, borderColor: c.color }]}
                >
                  <Ionicons
                    name={catIcon.icon}
                    size={14}
                    color={on ? '#fff' : c.color}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.filterItemText, on && { color: '#fff' }]} numberOfLines={2}>
                    {c.label}
                  </Text>
                  <Ionicons
                    name={on ? 'checkmark-circle' : 'ellipse-outline'}
                    size={16}
                    color={on ? '#fff' : colors.muted}
                    style={{ marginLeft: 'auto' }}
                  />
                </TouchableOpacity>
              );
            })}
            {/* Quick actions */}
            <View style={styles.filterActions}>
              <TouchableOpacity
                style={styles.filterActionBtn}
                onPress={() => setActive(new Set(allCategories.map((c) => c.id)))}
              >
                <Text style={styles.filterActionText}>All on</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.filterActionBtn}
                onPress={() => setActive(new Set())}
              >
                <Text style={styles.filterActionText}>All off</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      )}

      {/* Bottom action card — shown when a marker is selected */}
      {selected && (
        <View style={styles.actionCard}>
          {/* Main image preview or category icon placeholder */}
          <View style={styles.actionImageContainer}>
            {selectedImages.length > 0 && !imageError ? (
              <Image
                source={{ uri: selectedImages[0] }}
                style={styles.actionThumb}
                resizeMode="cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <View style={[styles.actionThumb, styles.actionThumbPlaceholder, {
                backgroundColor: selectedType === 'accommodation'
                  ? (ACCOM_TYPE_COLORS[selected.type] || ACCOMMODATION_CATEGORY.color)
                  : (getPoiCategory(selected)?.color || colors.primary),
              }]}>
                <Ionicons
                  name={selectedType === 'accommodation'
                    ? 'bed'
                    : (CATEGORY_ICONS[selected.category === 'wildlife' ? 'nature' : selected.category]?.icon || 'location')}
                  size={32}
                  color="#fff"
                />
              </View>
            )}
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle} numberOfLines={2}>
              {selected.name}
            </Text>
            {selectedType === 'accommodation' ? (
              <>
                <Text style={styles.actionSubtitle} numberOfLines={1}>
                  {regions.find((r) => r.id === selected.region)?.name || selected.region}
                  {selected.price_nzd_per_night ? ` · NZ$${selected.price_nzd_per_night}/night` : ''}
                </Text>
                {selected.rating != null && (
                  <Text style={styles.actionRating}>★ {selected.rating.toFixed(1)}</Text>
                )}
              </>
            ) : (
              <>
                {selected.reviews?.rating != null && (
                  <View style={styles.ratingRow}>
                    <Text style={styles.starText}>
                      {'★'.repeat(Math.floor(selected.reviews.rating))}
                      {'☆'.repeat(5 - Math.floor(selected.reviews.rating))}
                    </Text>
                    <Text style={styles.ratingValue}>{selected.reviews.rating.toFixed(1)}</Text>
                  </View>
                )}
                <Text style={styles.actionSubtitle} numberOfLines={3}>
                  {selected.reviews?.summary || selected.short}
                </Text>
              </>
            )}
          </View>
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.actionBtn} onPress={driveTo}>
              <Ionicons name="navigate" size={18} color={colors.primary} />
            </TouchableOpacity>
            {selectedType !== 'accommodation' && (
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => setSaveModalPoi(selected)}
              >
                <Ionicons name="bookmark-outline" size={18} color={colors.primary} />
              </TouchableOpacity>
            )}
            {selectedType !== 'accommodation' && (
              <TouchableOpacity
                style={[styles.actionBtn, isInCompare && styles.actionBtnActive]}
                onPress={toggleCompare}
              >
                <Ionicons name="swap-horizontal" size={18} color={isInCompare ? '#fff' : colors.primary} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnPrimary]}
              onPress={openDetails}
            >
              <Ionicons name="information-circle" size={18} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Save modal */}
      <SaveToListModal
        visible={!!saveModalPoi}
        onClose={() => setSaveModalPoi(null)}
        poi={saveModalPoi}
      />

      <SnapIdentifyModal
        visible={showSnap}
        onClose={() => setShowSnap(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  map: { flex: 1 },
  // Unified category marker style (icon inside colored circle)
  catMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  // Filter toggle button — simple icon only
  filterToggle: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    backgroundColor: colors.surface,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterToggleActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  // Filter panel (collapsible list)
  filterPanel: {
    position: 'absolute',
    top: spacing.md + 48,
    left: spacing.md,
    width: 280,
    maxHeight: 400,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  filterItemText: { fontSize: 13, fontWeight: '600', color: colors.text, flex: 1, flexWrap: 'wrap' },
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  filterActionBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterActionText: { fontSize: 11, fontWeight: '600', color: colors.primary },
  // Action card
  actionCard: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.lg + 70, // Added 70px to clear the bottom tab bar
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  actionImageContainer: {
    marginRight: spacing.sm,
  },
  actionThumb: {
    width: 100,
    height: 100,
    borderRadius: radius.md,
    flexShrink: 0,
  },
  actionThumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionContent: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  actionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 4, lineHeight: 20 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2, marginBottom: 2 },
  starText: { fontSize: 12, color: '#F5A623', letterSpacing: 1 },
  ratingValue: { fontSize: 12, fontWeight: '700', color: colors.text },
  actionSubtitle: { fontSize: 13, color: colors.muted, marginTop: 2, lineHeight: 18 },
  actionRating: { color: colors.text, fontWeight: '600', fontSize: 13, marginTop: 2 },
  actionButtons: {
    gap: spacing.sm,
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  actionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexShrink: 0,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  actionBtnPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
  snapFab: {
    position: 'absolute',
    top: 60,
    right: spacing.md,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 900,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  actionBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
});
