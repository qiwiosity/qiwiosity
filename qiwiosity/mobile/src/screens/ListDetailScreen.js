import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMyLists } from '../context/MyListsContext';
import { useItinerary } from '../context/ItineraryContext';
import { useData } from '../context/DataContext';
import { colors, radius, spacing, type } from '../theme';

export default function ListDetailScreen({ route, navigation }) {
  const { listId } = route.params;
  const { lists, removeFromList, renameList, addToList } = useMyLists();
  const itinerary = useItinerary();
  const { categories, getPoiImages } = useData();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');

  const list = useMemo(() => lists.find((l) => l.id === listId), [lists, listId]);

  if (!list) {
    return (
      <View style={styles.container}>
        <Text style={[type.body, { textAlign: 'center', marginTop: 40 }]}>
          List not found.
        </Text>
      </View>
    );
  }

  const handleRename = () => {
    const name = editName.trim();
    if (name) {
      renameList(listId, name);
    }
    setEditing(false);
  };

  const startEditing = () => {
    setEditName(list.name);
    setEditing(true);
  };

  const handleRemove = (item) => {
    Alert.alert(
      'Remove from list?',
      `Remove "${item.name}" from "${list.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeFromList(listId, item.id),
        },
      ],
    );
  };

  const addAllToTrip = () => {
    let added = 0;
    list.items.forEach((item) => {
      if (!itinerary.has(item.id)) {
        if (item.category === 'accommodation' || item.itemType === 'accommodation') {
          itinerary.addAccommodation(item);
        } else {
          itinerary.add(item);
        }
        added++;
      }
    });
    Alert.alert(
      'Added to trip',
      added > 0
        ? `${added} place${added !== 1 ? 's' : ''} added to your current trip.`
        : 'All places are already in your trip.',
    );
  };

  const navigateToDetail = (item) => {
    if (item.category === 'accommodation' || item.itemType === 'accommodation') {
      navigation.navigate('AccommodationDetail', { id: item.id });
    } else {
      navigation.navigate('AttractionDetail', { id: item.id });
    }
  };

  return (
    <View style={styles.container}>
      {/* ── List header ───────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={[styles.headerIcon, { backgroundColor: list.color }]}>
          <Ionicons name={list.icon} size={28} color="#fff" />
        </View>
        {editing ? (
          <View style={styles.editRow}>
            <TextInput
              style={styles.editInput}
              value={editName}
              onChangeText={setEditName}
              autoFocus
              maxLength={40}
              onSubmitEditing={handleRename}
            />
            <TouchableOpacity onPress={handleRename}>
              <Ionicons name="checkmark-circle" size={28} color={colors.primary} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={startEditing} style={styles.nameRow}>
            <Text style={type.title}>{list.name}</Text>
            <Ionicons name="pencil" size={16} color={colors.muted} />
          </TouchableOpacity>
        )}
        <Text style={type.caption}>
          {list.items.length} place{list.items.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* ── Bulk actions ──────────────────────────────────────────────── */}
      {list.items.length > 0 && (
        <View style={styles.bulkRow}>
          <TouchableOpacity style={styles.bulkBtn} onPress={addAllToTrip}>
            <Ionicons name="navigate-outline" size={16} color={colors.primary} />
            <Text style={styles.bulkBtnText}>Add all to current trip</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Places list ───────────────────────────────────────────────── */}
      <FlatList
        data={list.items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}
        renderItem={({ item }) => {
          const cat = categories.find((c) => c.id === item.category);
          const inTrip = itinerary.has(item.id);
          const images = getPoiImages(item.id);
          const thumb = images.length > 0 ? images[0] : null;

          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigateToDetail(item)}
            >
              {/* Thumbnail */}
              {thumb ? (
                <Image source={{ uri: thumb }} style={styles.cardThumb} resizeMode="cover" />
              ) : (
                <View style={[styles.cardThumb, styles.cardThumbPlaceholder, { backgroundColor: cat?.color || list.color }]}>
                  <Ionicons name="image-outline" size={20} color="rgba(255,255,255,0.7)" />
                </View>
              )}
              <View style={{ flex: 1, padding: spacing.md }}>
                <Text style={type.heading}>{item.name}</Text>
                <Text style={type.caption}>
                  {item.duration_hours ? `${item.duration_hours}h · ` : ''}
                  {cat?.label || 'Place'}
                </Text>
                {item.short ? (
                  <Text style={[type.body, { marginTop: 4 }]} numberOfLines={2}>
                    {item.short}
                  </Text>
                ) : null}

                <View style={styles.actionRow}>
                  {!inTrip && (
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => {
                        if (item.category === 'accommodation' || item.itemType === 'accommodation') {
                          itinerary.addAccommodation(item);
                        } else {
                          itinerary.add(item);
                        }
                      }}
                    >
                      <Ionicons name="add-circle-outline" size={14} color={colors.primary} />
                      <Text style={styles.actionText}>Add to trip</Text>
                    </TouchableOpacity>
                  )}
                  {inTrip && (
                    <View style={styles.inTripBadge}>
                      <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                      <Text style={styles.inTripText}>In trip</Text>
                    </View>
                  )}
                </View>
              </View>

              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => handleRemove(item)}
              >
                <Ionicons name="close" size={18} color={colors.muted} />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="bookmark-outline" size={48} color={colors.border} />
            <Text style={styles.emptyText}>This list is empty</Text>
            <Text style={styles.emptyHint}>
              Save places from the map or search to add them here.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  // ── Header ──────────────────────────────────────────────────────────
  header: {
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.xs,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  editInput: {
    ...type.title,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    minWidth: 160,
    textAlign: 'center',
    paddingVertical: 4,
  },

  // ── Bulk actions ────────────────────────────────────────────────────
  bulkRow: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  bulkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  bulkBtnText: { color: colors.primary, fontWeight: '600', fontSize: 13 },

  // ── Cards ───────────────────────────────────────────────────────────
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardThumb: {
    width: 80,
    height: 'auto',
    minHeight: 80,
  },
  cardThumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionRow: { flexDirection: 'row', marginTop: 8, gap: 8 },
  actionBtn: {
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
  actionText: { fontSize: 11, fontWeight: '600', color: colors.primary },
  inTripBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    backgroundColor: '#E8F5E9',
  },
  inTripText: { fontSize: 11, fontWeight: '600', color: colors.success },

  removeBtn: {
    padding: spacing.md,
    justifyContent: 'center',
  },

  // ── Empty ──────────────────────────────────────────────────────────
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
    marginTop: 40,
  },
  emptyText: { ...type.heading, color: colors.muted },
  emptyHint: { ...type.caption, textAlign: 'center' },
});
