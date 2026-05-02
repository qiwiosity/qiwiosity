import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useItinerary } from '../context/ItineraryContext';
import { useData } from '../context/DataContext';
import { totalDistanceKm, estimateDrivingHours, optimiseRoute } from '../utils/geo';
import { openDirectionsTo, openDirectionsForTrip } from '../utils/directions';
import { colors, radius, spacing, type } from '../theme';

const NZ_REGION = {
  latitude: -41.0,
  longitude: 173.5,
  latitudeDelta: 15,
  longitudeDelta: 15,
};

// ─── Helpers ────────────────────────────────────────────────────────────
/**
 * Compute a bounding region that fits every stop with comfortable padding.
 */
function regionForStops(stops) {
  if (!stops.length) return NZ_REGION;
  let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
  stops.forEach((s) => {
    if (s.lat < minLat) minLat = s.lat;
    if (s.lat > maxLat) maxLat = s.lat;
    if (s.lng < minLng) minLng = s.lng;
    if (s.lng > maxLng) maxLng = s.lng;
  });
  const PAD = 1.3; // 30 % breathing room
  const latDelta = Math.max((maxLat - minLat) * PAD, 0.05);
  const lngDelta = Math.max((maxLng - minLng) * PAD, 0.05);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: latDelta,
    longitudeDelta: lngDelta,
  };
}

// ─── Component ──────────────────────────────────────────────────────────
export default function ItineraryScreen({ navigation }) {
  const { attractions, categories, accommodations } = useData();
  const { items, add, remove, reorder, clear, has } = useItinerary();
  const mapRef = useRef(null);

  // View mode: 'list' | 'map'
  const [viewMode, setViewMode] = useState('list');
  // Filter: 'all' | 'poi' | 'accommodation'
  const [itemFilter, setItemFilter] = useState('all');
  // Show all attractions on the map (dimmed) or only planned
  const [showAll, setShowAll] = useState(false);
  // Category filters when Show All is active
  const [activeCategories, setActiveCategories] = useState(
    new Set(categories.map((c) => c.id)),
  );
  // Currently tapped attraction in map view (for quick-add card)
  const [tapped, setTapped] = useState(null);

  // ── Filtered items based on itemFilter ────────────────────────────────
  const filteredItems = useMemo(() => {
    if (itemFilter === 'all') return items;
    return items.filter((i) => (i.itemType || 'poi') === itemFilter);
  }, [items, itemFilter]);

  const FILTER_OPTIONS = [
    { id: 'all', label: 'Everything', icon: 'layers-outline' },
    { id: 'poi', label: 'POIs', icon: 'location-outline' },
    { id: 'accommodation', label: 'Stays', icon: 'bed-outline' },
  ];

  // ── Derived data (always based on full items for stats) ────────────
  const distance = totalDistanceKm(items);
  const driveHours = estimateDrivingHours(distance);
  const totalHours = items.reduce((s, a) => s + (a.duration_hours || 0), 0);
  const poiCount = items.filter((i) => (i.itemType || 'poi') === 'poi').length;
  const stayCount = items.filter((i) => i.itemType === 'accommodation').length;

  const plannedRegion = useMemo(() => regionForStops(items), [items]);

  // Route coordinates for the polyline
  const routeCoords = useMemo(
    () => items.map((s) => ({ latitude: s.lat, longitude: s.lng })),
    [items],
  );

  // IDs in itinerary for O(1) lookup
  const plannedIds = useMemo(() => new Set(items.map((i) => i.id)), [items]);

  // Unplanned attractions (only computed when showAll is true)
  const unplannedAttractions = useMemo(() => {
    if (!showAll) return [];
    return attractions.filter(
      (a) => !plannedIds.has(a.id) && activeCategories.has(a.category),
    );
  }, [showAll, attractions, plannedIds, activeCategories]);

  // ── Handlers ──────────────────────────────────────────────────────────
  const toggleCategory = (id) => {
    const next = new Set(activeCategories);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    if (next.size === 0) categories.forEach((c) => next.add(c.id));
    setActiveCategories(next);
  };

  const moveUp = (index) => {
    if (index === 0) return;
    const next = [...items];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    reorder(next);
  };
  const moveDown = (index) => {
    if (index >= items.length - 1) return;
    const next = [...items];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    reorder(next);
  };

  const confirmClear = () => {
    Alert.alert('Clear itinerary?', 'This removes all saved stops.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: clear },
    ]);
  };

  const optimiseOrder = () => {
    if (items.length < 3) return;
    const before = totalDistanceKm(items);
    const optimised = optimiseRoute(items);
    const after = totalDistanceKm(optimised);
    const saved = before - after;
    reorder(optimised);
    Alert.alert(
      'Route optimised!',
      saved > 0
        ? `Saved ${saved} km of driving by reordering your ${items.length} stops.`
        : `Your stops are already in an efficient order.`,
    );
  };

  const openDetails = (item) => {
    if (item.itemType === 'accommodation') {
      navigation.navigate('AccommodationDetail', { id: item.id });
    } else {
      navigation.navigate('AttractionDetail', { id: item.id });
    }
  };

  const quickAdd = (attraction) => {
    add(attraction);
    setTapped(null);
  };

  // When switching to map view, fit to planned stops
  const switchToMap = () => {
    setViewMode('map');
    setTimeout(() => {
      if (mapRef.current && items.length > 0) {
        mapRef.current.animateToRegion(plannedRegion, 400);
      }
    }, 100);
  };

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <View style={styles.container}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={type.title}>Your Trip</Text>
        {items.length > 0 && (
          <TouchableOpacity onPress={confirmClear}>
            <Text style={styles.clearLink}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── View toggle pill ───────────────────────────────────────────── */}
      <View style={styles.toggleRow}>
        <View style={styles.togglePill}>
          <TouchableOpacity
            onPress={() => setViewMode('list')}
            style={[
              styles.toggleBtn,
              viewMode === 'list' && styles.toggleBtnActive,
            ]}
          >
            <Ionicons
              name="list"
              size={14}
              color={viewMode === 'list' ? '#fff' : colors.muted}
            />
            <Text
              style={[
                styles.toggleText,
                viewMode === 'list' && styles.toggleTextActive,
              ]}
            >
              List
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={switchToMap}
            style={[
              styles.toggleBtn,
              viewMode === 'map' && styles.toggleBtnActive,
            ]}
          >
            <Ionicons
              name="map"
              size={14}
              color={viewMode === 'map' ? '#fff' : colors.muted}
            />
            <Text
              style={[
                styles.toggleText,
                viewMode === 'map' && styles.toggleTextActive,
              ]}
            >
              Map
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Item type filter ──────────────────────────────────────────── */}
      {items.length > 0 && (
        <View style={styles.filterRow}>
          {FILTER_OPTIONS.map((f) => {
            const active = itemFilter === f.id;
            const count = f.id === 'all' ? items.length : f.id === 'poi' ? poiCount : stayCount;
            return (
              <TouchableOpacity
                key={f.id}
                onPress={() => setItemFilter(f.id)}
                style={[styles.filterChip, active && styles.filterChipActive]}
              >
                <Ionicons
                  name={f.icon}
                  size={13}
                  color={active ? '#fff' : colors.muted}
                />
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                  {f.label} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* ── Empty state ────────────────────────────────────────────────── */}
      {items.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="map-outline" size={48} color={colors.border} />
          <Text style={styles.emptyText}>No stops yet.</Text>
          <Text style={styles.emptyHint}>
            Add attractions from the Explore or Attractions tab.
          </Text>
        </View>
      ) : viewMode === 'list' ? (
        /* ═════════════════════════════════════════════════════════════════
           LIST VIEW (existing, refined)
           ═════════════════════════════════════════════════════════════════ */
        <>
          <FlatList
            data={filteredItems}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{
              padding: spacing.md,
              paddingBottom: spacing.xl,
            }}
            ListEmptyComponent={
              <View style={styles.emptyFilter}>
                <Ionicons
                  name={itemFilter === 'accommodation' ? 'bed-outline' : 'location-outline'}
                  size={32}
                  color={colors.border}
                />
                <Text style={[type.caption, { textAlign: 'center', marginTop: spacing.sm }]}>
                  No {itemFilter === 'accommodation' ? 'accommodations' : 'POIs'} in your trip yet.
                  {'\n'}Add some from the {itemFilter === 'accommodation' ? 'Where to Stay' : 'Attractions'} tab.
                </Text>
              </View>
            }
            renderItem={({ item, index }) => {
              const isAccom = item.itemType === 'accommodation';
              const cat = !isAccom ? categories.find((c) => c.id === item.category) : null;

              // Colour stripe: teal for accommodations, category colour for POIs
              const stripeColor = isAccom ? '#1565C0' : (cat?.color || colors.primary);

              return (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => !isAccom && openDetails(item)}
                  style={styles.card}
                >
                  <View style={[styles.stripe, { backgroundColor: stripeColor }]} />
                  <View style={{ flex: 1, padding: spacing.md }}>
                    <Text style={styles.num}>
                      {isAccom ? 'STAY' : `STOP ${index + 1}`}
                    </Text>
                    <Text style={type.heading}>{item.name}</Text>
                    {isAccom ? (
                      <View>
                        <Text style={type.caption}>
                          {item.type ? item.type.charAt(0).toUpperCase() + item.type.slice(1).replace('-', ' ') : 'Accommodation'}
                          {item.price_nzd_per_night ? ` · NZ$${item.price_nzd_per_night}/night` : ''}
                        </Text>
                        {item.rating != null && (
                          <Text style={[type.caption, { color: '#F5A623', marginTop: 2 }]}>
                            ★ {item.rating.toFixed(1)}
                          </Text>
                        )}
                      </View>
                    ) : (
                      <Text style={type.caption}>
                        {item.duration_hours}h · {cat?.label}
                      </Text>
                    )}

                    <View style={styles.actionRow}>
                      {!isAccom && (
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.actionPrimary]}
                          onPress={() => openDetails(item)}
                        >
                          <Ionicons name="eye-outline" size={14} color="white" />
                          <Text style={styles.actionPrimaryText}>Details</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => openDirectionsTo(item)}
                      >
                        <Ionicons
                          name="navigate-outline"
                          size={14}
                          color={colors.primary}
                        />
                        <Text style={styles.actionText}>Drive to</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.actions}>
                    <TouchableOpacity
                      onPress={() => moveUp(index)}
                      style={styles.iconBtn}
                    >
                      <Text>▲</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => moveDown(index)}
                      style={styles.iconBtn}
                    >
                      <Text>▼</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => remove(item.id)}
                      style={styles.iconBtn}
                    >
                      <Text style={{ color: colors.danger, fontSize: 18 }}>
                        ×
                      </Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            }}
          />

          {/* Footer stats */}
          <View style={styles.footer}>
            {items.length >= 3 && (
              <TouchableOpacity
                style={styles.aiRouteBtn}
                onPress={optimiseOrder}
                activeOpacity={0.85}
              >
                <Ionicons name="sparkles" size={16} color="white" />
                <Text style={styles.aiRouteBtnText}>
                  AI: Create best route
                </Text>
              </TouchableOpacity>
            )}
            {items.length >= 1 && (
              <TouchableOpacity
                style={styles.tripDirBtn}
                onPress={() => openDirectionsForTrip(items)}
                activeOpacity={0.85}
              >
                <Ionicons name="navigate" size={16} color="white" />
                <Text style={styles.tripDirText}>
                  {items.length >= 2
                    ? `Get driving directions for whole trip (${items.length} stops)`
                    : 'Get driving directions'}
                </Text>
              </TouchableOpacity>
            )}
            <View style={styles.row}>
              <Text style={type.caption}>Stops</Text>
              <Text style={type.body}>{items.length}</Text>
            </View>
            <View style={styles.row}>
              <Text style={type.caption}>Activity time</Text>
              <Text style={type.body}>{totalHours} hrs</Text>
            </View>
            <View style={styles.row}>
              <Text style={type.caption}>Driving distance</Text>
              <Text style={type.body}>{distance} km</Text>
            </View>
            <View style={[styles.row, styles.rowTotal]}>
              <Text style={type.heading}>Estimated drive time</Text>
              <Text style={type.heading}>{driveHours} hrs</Text>
            </View>
          </View>
        </>
      ) : (
        /* ═════════════════════════════════════════════════════════════════
           MAP VIEW (new focused plan map)
           ═════════════════════════════════════════════════════════════════ */
        <View style={{ flex: 1 }}>
          <MapView
            ref={mapRef}
            /* provider removed for Expo Go compatibility */
            style={styles.planMap}
            initialRegion={plannedRegion}
            onPress={() => setTapped(null)}
          >
            {/* ── Route polyline ──────────────────────────────────────── */}
            {routeCoords.length >= 2 && (
              <Polyline
                coordinates={routeCoords}
                strokeColor={colors.primary}
                strokeWidth={3}
                lineDashPattern={[8, 4]}
              />
            )}

            {/* ── Unplanned (dimmed) markers — only when Show All ───── */}
            {unplannedAttractions.map((a) => {
              const cat = categories.find((c) => c.id === a.category);
              return (
                <Marker
                  key={`dim-${a.id}`}
                  coordinate={{ latitude: a.lat, longitude: a.lng }}
                  onPress={() => setTapped(a)}
                  anchor={{ x: 0.5, y: 0.5 }}
                  tracksViewChanges={false}
                >
                  <View
                    style={[
                      styles.dimPin,
                      { backgroundColor: cat?.color || '#999' },
                    ]}
                  />
                </Marker>
              );
            })}

            {/* ── Planned stop markers (numbered, prominent) ──────── */}
            {items.map((stop, index) => {
              const cat = categories.find((c) => c.id === stop.category);
              return (
                <Marker
                  key={`plan-${stop.id}`}
                  coordinate={{ latitude: stop.lat, longitude: stop.lng }}
                  onPress={() => setTapped(stop)}
                  anchor={{ x: 0.5, y: 1 }}
                  tracksViewChanges={false}
                >
                  <View style={styles.plannedPinWrap}>
                    <View
                      style={[
                        styles.plannedPin,
                        { backgroundColor: cat?.color || colors.primary },
                      ]}
                    >
                      <Text style={styles.plannedPinNum}>{index + 1}</Text>
                    </View>
                    <View
                      style={[
                        styles.plannedPinTail,
                        {
                          borderTopColor: cat?.color || colors.primary,
                        },
                      ]}
                    />
                  </View>
                </Marker>
              );
            })}
          </MapView>

          {/* ── Show All toggle + category chips ───────────────────────── */}
          <View style={styles.showAllBar}>
            <TouchableOpacity
              style={[
                styles.showAllPill,
                showAll && styles.showAllPillActive,
              ]}
              onPress={() => {
                setShowAll(!showAll);
                setTapped(null);
              }}
              activeOpacity={0.75}
            >
              <Ionicons
                name={showAll ? 'eye' : 'eye-off-outline'}
                size={14}
                color={showAll ? colors.primary : colors.muted}
              />
              <Text
                style={[
                  styles.showAllText,
                  showAll && styles.showAllTextActive,
                ]}
              >
                Show all places
              </Text>
            </TouchableOpacity>

            {showAll && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingLeft: spacing.sm }}
              >
                {categories.map((c) => {
                  const on = activeCategories.has(c.id);
                  return (
                    <TouchableOpacity
                      key={c.id}
                      onPress={() => toggleCategory(c.id)}
                      style={[
                        styles.catChip,
                        on && { backgroundColor: c.color, borderColor: c.color },
                      ]}
                    >
                      <Text
                        style={[styles.catChipText, on && { color: '#fff' }]}
                      >
                        {c.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>

          {/* ── Tapped attraction card ─────────────────────────────────── */}
          {tapped && (
            <View style={styles.tappedCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.tappedName} numberOfLines={1}>
                  {tapped.name}
                </Text>
                {tapped.reviews?.rating != null && (
                  <View style={styles.tappedRatingRow}>
                    <Text style={styles.tappedStars}>
                      {'★'.repeat(Math.floor(tapped.reviews.rating))}
                      {'☆'.repeat(5 - Math.floor(tapped.reviews.rating))}
                    </Text>
                    <Text style={styles.tappedRatingVal}>
                      {tapped.reviews.rating.toFixed(1)}
                    </Text>
                  </View>
                )}
                <Text style={styles.tappedSub} numberOfLines={2}>
                  {tapped.short}
                </Text>
              </View>
              <View style={{ gap: spacing.sm }}>
                {plannedIds.has(tapped.id) ? (
                  <>
                    <TouchableOpacity
                      style={[styles.tappedBtn, styles.tappedBtnPrimary]}
                      onPress={() => openDetails(tapped)}
                    >
                      <Ionicons name="eye-outline" size={16} color="#fff" />
                      <Text style={styles.tappedBtnTextLight}>Details</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.tappedBtn}
                      onPress={() => {
                        remove(tapped.id);
                        setTapped(null);
                      }}
                    >
                      <Ionicons name="close-circle-outline" size={16} color={colors.danger} />
                      <Text style={[styles.tappedBtnText, { color: colors.danger }]}>
                        Remove
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <TouchableOpacity
                      style={[styles.tappedBtn, styles.tappedBtnAccent]}
                      onPress={() => quickAdd(tapped)}
                    >
                      <Ionicons name="add-circle-outline" size={16} color="#fff" />
                      <Text style={styles.tappedBtnTextLight}>Add</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.tappedBtn}
                      onPress={() => openDetails(tapped)}
                    >
                      <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
                      <Text style={styles.tappedBtnText}>Details</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          )}

          {/* ── Map footer summary ─────────────────────────────────────── */}
          {!tapped && (
            <View style={styles.mapFooter}>
              <View style={{ flex: 1 }}>
                <Text style={styles.mapFooterTitle}>
                  {items.length} stop{items.length !== 1 ? 's' : ''}
                </Text>
                <Text style={styles.mapFooterSub}>
                  {totalHours}h activities · {distance} km driving
                </Text>
              </View>
              {items.length >= 3 && (
                <TouchableOpacity
                  style={styles.mapFooterAiBtn}
                  onPress={optimiseOrder}
                  activeOpacity={0.85}
                >
                  <Ionicons name="sparkles" size={16} color="white" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.mapFooterBtn}
                onPress={() => openDirectionsForTrip(items)}
                activeOpacity={0.85}
              >
                <Ionicons name="navigate" size={16} color="white" />
                <Text style={styles.mapFooterBtnText}>Navigate</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingTop: 50 },

  // ── Header ──────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  clearLink: { color: colors.danger, fontWeight: '600' },

  // ── View toggle ─────────────────────────────────────────────────────
  toggleRow: { alignItems: 'center', marginBottom: spacing.md },
  togglePill: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 18,
  },
  toggleBtnActive: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
  },
  toggleText: { fontSize: 12, fontWeight: '600', color: colors.muted },
  toggleTextActive: { color: '#fff' },

  // ── Item type filter ────────────────────────────────────────────────
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    gap: 6,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: { fontSize: 11, fontWeight: '600', color: colors.muted },
  filterChipTextActive: { color: '#fff' },

  // ── Empty state ─────────────────────────────────────────────────────
  emptyFilter: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.xs,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  emptyText: { ...type.heading, color: colors.muted },
  emptyHint: { ...type.caption, textAlign: 'center' },

  // ── List view cards ─────────────────────────────────────────────────
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  stripe: { width: 6 },
  num: {
    fontSize: 10,
    color: colors.muted,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  actions: {
    flexDirection: 'column',
    justifyContent: 'space-around',
    paddingRight: 8,
  },
  iconBtn: { padding: 6 },
  actionRow: { flexDirection: 'row', marginTop: 10, gap: 8 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  actionPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  actionText: { fontSize: 12, color: colors.primary, fontWeight: '600' },
  actionPrimaryText: { fontSize: 12, color: 'white', fontWeight: '600' },

  // ── List footer ─────────────────────────────────────────────────────
  footer: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  aiRouteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.accent,
    paddingVertical: 12,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  aiRouteBtnText: { color: 'white', fontWeight: '700', fontSize: 14 },
  tripDirBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  tripDirText: { color: 'white', fontWeight: '700', fontSize: 13 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  rowTotal: {
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingTop: 10,
    marginTop: 6,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // MAP VIEW
  // ═══════════════════════════════════════════════════════════════════════
  planMap: { flex: 1 },

  // ── Planned pin (numbered, with tail) ───────────────────────────────
  plannedPinWrap: { alignItems: 'center' },
  plannedPin: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  plannedPinNum: { color: '#fff', fontSize: 13, fontWeight: '800' },
  plannedPinTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },

  // ── Unplanned pin (visible but visually secondary) ──────────────────
  dimPin: {
    width: 18,
    height: 18,
    borderRadius: 9,
    opacity: 0.85,
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },

  // ── Show All bar ────────────────────────────────────────────────────
  showAllBar: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  showAllPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surface,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  showAllPillActive: {
    borderColor: colors.primary,
    backgroundColor: '#E8F5F5',
  },
  showAllText: { fontSize: 11, fontWeight: '600', color: colors.muted },
  showAllTextActive: { color: colors.primary },

  // ── Category chips (in show-all mode) ───────────────────────────────
  catChip: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginRight: 6,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  catChipText: { fontSize: 10, fontWeight: '600', color: colors.text },

  // ── Tapped card (quick-add / details) ───────────────────────────────
  tappedCard: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  tappedName: { ...type.heading, fontSize: 15 },
  tappedRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  tappedStars: { fontSize: 12, color: '#F5A623', letterSpacing: 1 },
  tappedRatingVal: { fontSize: 11, fontWeight: '700', color: colors.text },
  tappedSub: { ...type.caption, marginTop: 2 },
  tappedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  tappedBtnPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tappedBtnAccent: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  tappedBtnText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  tappedBtnTextLight: { fontSize: 12, fontWeight: '700', color: '#fff' },

  // ── Map footer summary ──────────────────────────────────────────────
  mapFooter: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  mapFooterTitle: { ...type.heading, fontSize: 15 },
  mapFooterSub: { ...type.caption, marginTop: 2 },
  mapFooterAiBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  mapFooterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radius.md,
  },
  mapFooterBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
