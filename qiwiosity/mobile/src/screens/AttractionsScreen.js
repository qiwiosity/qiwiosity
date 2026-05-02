import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../context/DataContext';
import { useItinerary } from '../context/ItineraryContext';
import { useCompare } from '../context/CompareContext';
import { colors, radius, spacing, type } from '../theme';
import SaveToListModal from '../components/SaveToListModal';

export default function AttractionsScreen({ navigation }) {
  const { attractions, regions, categories, getPoiImages } = useData();
  const { add, has, remove } = useItinerary();
  const compare = useCompare();
  const [query, setQuery] = useState('');
  const [longPressPoi, setLongPressPoi] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return attractions;
    return attractions.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.short.toLowerCase().includes(q) ||
        (a.tags || []).some((t) => t.toLowerCase().includes(q))
    );
  }, [query]);

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        placeholder="Search attractions, tags, regions..."
        value={query}
        onChangeText={setQuery}
      />
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing.md }}
        renderItem={({ item }) => {
          const cat = categories.find((c) => c.id === item.category);
          const region = regions.find((r) => r.id === item.region);
          const inTrip = has(item.id);
          const inCompare = compare.has(item.id);
          const imgs = getPoiImages(item.id);
          const thumb = imgs.length > 0 ? imgs[0] : null;
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('AttractionDetail', { id: item.id })}
              onLongPress={() => setLongPressPoi(item)}
              delayLongPress={400}
            >
              {thumb ? (
                <Image source={{ uri: thumb }} style={styles.cardThumb} resizeMode="cover" />
              ) : (
                <View style={[styles.cardStrip, { backgroundColor: cat?.color || colors.primary }]} />
              )}
              <View style={{ flex: 1, padding: spacing.md }}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={type.heading}>{item.name}</Text>
                    <Text style={[type.caption, { marginTop: 2 }]}>
                      {region?.name} · {item.duration_hours}h · {cat?.label}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 4 }}>
                    <TouchableOpacity
                      style={[styles.tripBtn, inCompare && styles.compareBtnActive]}
                      onPress={(e) => {
                        e.stopPropagation && e.stopPropagation();
                        compare.toggle(item);
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={inCompare ? 'checkmark-circle' : 'git-compare-outline'}
                        size={16}
                        color={inCompare ? '#fff' : colors.primary}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.tripBtn, inTrip && styles.tripBtnActive]}
                      onPress={(e) => {
                        e.stopPropagation && e.stopPropagation();
                        inTrip ? remove(item.id) : add(item);
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={inTrip ? 'checkmark-circle' : 'add-circle-outline'}
                        size={16}
                        color={inTrip ? '#fff' : colors.primary}
                      />
                      <Text style={[styles.tripBtnText, inTrip && styles.tripBtnTextActive]}>
                        {inTrip ? 'Added' : 'Add'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={[type.body, { marginTop: 6 }]} numberOfLines={2}>
                  {item.short}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* Long-press save modal */}
      <SaveToListModal
        visible={!!longPressPoi}
        onClose={() => setLongPressPoi(null)}
        poi={longPressPoi}
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
  },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardStrip: { width: 6 },
  cardThumb: { width: 80, height: '100%', minHeight: 80 },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  tripBtn: {
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
  tripBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tripBtnText: { fontSize: 11, fontWeight: '700', color: colors.primary },
  tripBtnTextActive: { color: '#fff' },
  compareBtnActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
});
