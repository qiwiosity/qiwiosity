import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import attractions from '../data/attractions.json';
import categories from '../data/categories.json';
import { openDirectionsTo } from '../utils/directions';
import { getAttractionImage } from '../utils/getPoiImage';
import { colors, radius, spacing, type } from '../theme';

/* Star rating helper */
function StarRating({ rating }) {
  if (!rating) return null;
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

const NZ_REGION = { latitude: -41.0, longitude: 173.5, latitudeDelta: 15, longitudeDelta: 15 };

/* Pre-compute category lookup */
const catMap = Object.fromEntries(categories.map((c) => [c.id, c]));

export default function MapScreen({ navigation }) {
  const mapRef = useRef(null);
  const [active, setActive] = useState(new Set(categories.map((c) => c.id)));
  const [selected, setSelected] = useState(null);
  const [locationGranted, setLocationGranted] = useState(false);
  const [userCoords, setUserCoords] = useState(null);

  /* ── Request location permission & start watching ──────────────── */
  useEffect(() => {
    let sub;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      setLocationGranted(true);

      // Get an initial fix quickly
      try {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setUserCoords({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
      } catch (_) {
        /* non-fatal — the watcher will pick it up */
      }

      // Keep updating in the background
      sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 50, // update every 50 m
          timeInterval: 10_000, // or every 10 s
        },
        (loc) => {
          setUserCoords({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
        }
      );
    })();

    return () => sub?.remove();
  }, []);

  const visible = useMemo(() => attractions.filter((a) => active.has(a.category)), [active]);

  const toggle = (id) => {
    const next = new Set(active);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setActive(next);
  };

  const openDetails = () => {
    if (!selected) return;
    navigation.navigate('AttractionDetail', { id: selected.id });
  };
  const drive = () => {
    if (!selected) return;
    openDirectionsTo(selected);
  };

  /* ── Centre the map on the user's current position ─────────────── */
  const centreOnUser = useCallback(() => {
    if (!userCoords || !mapRef.current) return;
    mapRef.current.animateToRegion(
      { ...userCoords, latitudeDelta: 0.15, longitudeDelta: 0.15 },
      600
    );
  }, [userCoords]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={styles.map}
        initialRegion={NZ_REGION}
        showsUserLocation={locationGranted}
        showsMyLocationButton={false}  /* we render our own button */
        userInterfaceStyle="light"
        onPress={() => setSelected(null)}
      >
        {visible.map((a) => {
          const cat = catMap[a.category];
          return (
            <Marker
              key={a.id}
              coordinate={{ latitude: a.lat, longitude: a.lng }}
              title={a.name}
              description={a.short}
              pinColor={cat?.color || colors.primary}
              onPress={() => setSelected(a)}
              onCalloutPress={() => navigation.navigate('AttractionDetail', { id: a.id })}
            />
          );
        })}
      </MapView>

      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.md }}>
          {categories.map((c) => {
            const on = active.has(c.id);
            return (
              <TouchableOpacity
                key={c.id}
                onPress={() => toggle(c.id)}
                style={[styles.chip, on && { backgroundColor: c.color, borderColor: c.color }]}
              >
                <Text style={[styles.chipText, on && { color: '#fff' }]}>{c.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Locate-me FAB ── */}
      {locationGranted && (
        <TouchableOpacity
          style={styles.locateBtn}
          onPress={centreOnUser}
          activeOpacity={0.8}
        >
          <Ionicons name="locate" size={22} color={userCoords ? colors.primary : colors.muted} />
        </TouchableOpacity>
      )}

      {/* Bottom action card shown after tapping a pin. */}
      {selected && (
        <View style={styles.actionCard}>
          <Image
            source={{ uri: getAttractionImage(selected) }}
            style={styles.actionImage}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.actionTitle} numberOfLines={1}>{selected.name}</Text>
            {selected.reviews?.rating && (
              <StarRating rating={selected.reviews.rating} />
            )}
            <Text style={styles.actionSubtitle} numberOfLines={2}>{selected.short}</Text>
          </View>
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.actionBtn} onPress={drive}>
              <Ionicons name="navigate" size={18} color={colors.primary} />
              <Text style={styles.actionBtnText}>Drive</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnPrimary]} onPress={openDetails}>
              <Ionicons name="information-circle" size={18} color="white" />
              <Text style={[styles.actionBtnText, { color: 'white' }]}>Details</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  map: { flex: 1 },
  filterBar: {
    position: 'absolute',
    top: spacing.md,
    left: 0,
    right: 0,
  },
  chip: {
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginRight: 8,
  },
  chipText: { ...type.caption, color: colors.text, fontWeight: '600' },
  actionCard: {
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
  actionImage: {
    width: 60,
    height: 60,
    borderRadius: radius.md,
  },
  actionTitle: { ...type.heading, fontSize: 15 },
  actionSubtitle: { ...type.caption, marginTop: 2 },
  actionButtons: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  actionBtnPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
  actionBtnText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  locateBtn: {
    position: 'absolute',
    right: spacing.md,
    top: 60,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
