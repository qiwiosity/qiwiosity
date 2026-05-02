import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useItinerary } from '../context/ItineraryContext';
import { totalDistanceKm, estimateDrivingHours } from '../utils/geo';
import { openDirectionsTo, openDirectionsForTrip } from '../utils/directions';
import categories from '../data/categories.json';
import { colors, radius, spacing, type } from '../theme';

export default function ItineraryScreen({ navigation }) {
  const { items, remove, reorder, clear } = useItinerary();

  const distance = totalDistanceKm(items);
  const driveHours = estimateDrivingHours(distance);
  const totalHours = items.reduce((s, a) => s + (a.duration_hours || 0), 0);

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

  const openDetails = (item) => {
    navigation.navigate('AttractionDetail', { id: item.id });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={type.title}>Your Itinerary</Text>
        {items.length > 0 && (
          <TouchableOpacity onPress={confirmClear}>
            <Text style={styles.clearLink}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {items.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No stops yet.</Text>
          <Text style={styles.emptyHint}>Add attractions from the Explore or Attractions tab.</Text>
        </View>
      ) : (
        <>
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}
            renderItem={({ item, index }) => {
              const cat = categories.find((c) => c.id === item.category);
              return (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => openDetails(item)}
                  style={styles.card}
                >
                  <View style={[styles.stripe, { backgroundColor: cat?.color || colors.primary }]} />
                  <View style={{ flex: 1, padding: spacing.md }}>
                    <Text style={styles.num}>STOP {index + 1}</Text>
                    <Text style={type.heading}>{item.name}</Text>
                    <Text style={type.caption}>{item.duration_hours}h · {cat?.label}</Text>

                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.actionPrimary]}
                        onPress={() => openDetails(item)}
                      >
                        <Ionicons name="eye-outline" size={14} color="white" />
                        <Text style={styles.actionPrimaryText}>Details</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => openDirectionsTo(item)}
                      >
                        <Ionicons name="navigate-outline" size={14} color={colors.primary} />
                        <Text style={styles.actionText}>Drive to</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.actions}>
                    <TouchableOpacity onPress={() => moveUp(index)} style={styles.iconBtn}><Text>▲</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => moveDown(index)} style={styles.iconBtn}><Text>▼</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => remove(item.id)} style={styles.iconBtn}><Text style={{ color: colors.danger, fontSize: 18 }}>×</Text></TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            }}
          />

          <View style={styles.footer}>
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
            <View style={styles.row}><Text style={type.caption}>Stops</Text><Text style={type.body}>{items.length}</Text></View>
            <View style={styles.row}><Text style={type.caption}>Activity time</Text><Text style={type.body}>{totalHours} hrs</Text></View>
            <View style={styles.row}><Text style={type.caption}>Driving distance</Text><Text style={type.body}>{distance} km</Text></View>
            <View style={[styles.row, styles.rowTotal]}>
              <Text style={type.heading}>Estimated drive time</Text>
              <Text style={type.heading}>{driveHours} hrs</Text>
            </View>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingTop: 50 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  clearLink: { color: colors.danger, fontWeight: '600' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyText: { ...type.heading, color: colors.muted },
  emptyHint: { ...type.caption, marginTop: 8, textAlign: 'center' },
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
  num: { fontSize: 10, color: colors.muted, fontWeight: '700', letterSpacing: 1.2 },
  actions: { flexDirection: 'column', justifyContent: 'space-around', paddingRight: 8 },
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
  actionPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
  actionText: { fontSize: 12, color: colors.primary, fontWeight: '600' },
  actionPrimaryText: { fontSize: 12, color: 'white', fontWeight: '600' },
  footer: { padding: spacing.lg, backgroundColor: colors.surface, borderTopWidth: 1, borderColor: colors.border },
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
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  rowTotal: { borderTopWidth: 1, borderColor: colors.border, paddingTop: 10, marginTop: 6 },
});
