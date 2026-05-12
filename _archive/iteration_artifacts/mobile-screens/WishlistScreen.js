/**
 * WishlistScreen — View and manage places saved from the Chrome extension
 * and the mobile app. Synced with Supabase.
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, Image, TouchableOpacity, StyleSheet,
  RefreshControl, Alert, Linking, ActivityIndicator, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWishlist } from '../context/WishlistContext';
import { useData } from '../context/DataContext';
import { colors, spacing, radius, type } from '../theme';

const SOURCE_ICONS = {
  youtube:     { icon: 'logo-youtube',    color: '#FF0000' },
  instagram:   { icon: 'logo-instagram',  color: '#E1306C' },
  facebook:    { icon: 'logo-facebook',   color: '#1877F2' },
  tiktok:      { icon: 'logo-tiktok',     color: '#000000' },
  'google-maps': { icon: 'map',           color: '#4285F4' },
  tripadvisor: { icon: 'earth',           color: '#34E0A1' },
  'tourism-nz':  { icon: 'leaf',          color: '#15888A' },
  'doc-nz':    { icon: 'trail-sign',      color: '#2E7D32' },
  blog:        { icon: 'document-text',   color: '#6B7280' },
  mobile:      { icon: 'phone-portrait',  color: '#15888A' },
  extension:   { icon: 'extension-puzzle', color: '#15888A' },
};

const FILTERS = [
  { key: 'all',     label: 'All' },
  { key: 'unvisited', label: 'To Visit' },
  { key: 'visited', label: 'Visited' },
  { key: 'matched', label: 'In App' },
];

export default function WishlistScreen({ navigation }) {
  const wishlist = useWishlist();
  const { attractions } = useData();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await wishlist.refresh();
    setRefreshing(false);
  }, [wishlist]);

  // ─�� Filter items ──────────────────────────────────────
  const filtered = wishlist.items.filter(item => {
    if (filter === 'unvisited' && item.is_visited) return false;
    if (filter === 'visited' && !item.is_visited) return false;
    if (filter === 'matched' && !item.poi_id) return false;

    if (search) {
      const q = search.toLowerCase();
      return (
        item.title?.toLowerCase().includes(q) ||
        item.place_name?.toLowerCase().includes(q) ||
        item.region?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // ── Not authenticated ─────────────────────────────────
  if (!wishlist.isAuthenticated) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="cloud-offline" size={48} color={colors.muted} />
        <Text style={styles.emptyTitle}>Sign in to sync your wishlist</Text>
        <Text style={styles.emptyText}>
          Save places from YouTube, Instagram, TripAdvisor and more using the
          Qiwiosity Chrome extension — they'll appear here.
        </Text>
      </View>
    );
  }

  // ── Loading ───────────────────────────────────────────
  if (wishlist.loading && !wishlist.items.length) {
    return (
      <View style={styles.emptyContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.emptyText, { marginTop: spacing.md }]}>Loading your wishlist...</Text>
      </View>
    );
  }

  // ── Render item ───────────────────────────────────────
  const renderItem = ({ item }) => {
    const src = SOURCE_ICONS[item.source_site] || SOURCE_ICONS[item.saved_from] || SOURCE_ICONS.blog;
    const matchedAttraction = item.poi_id ? attractions?.find(a => a.id === item.poi_id) : null;

    return (
      <TouchableOpacity
        style={[styles.card, item.is_visited && styles.cardVisited]}
        onPress={() => {
          if (matchedAttraction) {
            navigation.navigate('AttractionDetail', { attraction: matchedAttraction });
          } else {
            Linking.openURL(item.url).catch(() => {});
          }
        }}
        activeOpacity={0.7}
      >
        {/* Thumbnail */}
        {item.thumbnail_url || item.poi_image_url ? (
          <Image
            source={{ uri: item.poi_image_url || item.thumbnail_url }}
            style={styles.thumb}
          />
        ) : (
          <View style={[styles.thumbPlaceholder, { backgroundColor: src.color + '15' }]}>
            <Ionicons name={src.icon} size={24} color={src.color} />
          </View>
        )}

        {/* Content */}
        <View style={styles.cardBody}>
          <View style={styles.cardTop}>
            <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
            <TouchableOpacity
              onPress={() => handleToggleVisited(item)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name={item.is_visited ? 'checkmark-circle' : 'checkmark-circle-outline'}
                size={24}
                color={item.is_visited ? colors.success : colors.border}
              />
            </TouchableOpacity>
          </View>

          {/* Meta row */}
          <View style={styles.metaRow}>
            <Ionicons name={src.icon} size={12} color={src.color} />
            <Text style={styles.metaText}>{item.source_site}</Text>
            {item.place_name && (
              <>
                <Text style={styles.metaDot}>·</Text>
                <Ionicons name="location" size={12} color={colors.muted} />
                <Text style={styles.metaText}>{item.place_name}</Text>
              </>
            )}
            {item.region && (
              <>
                <Text style={styles.metaDot}>·</Text>
                <Text style={styles.metaText}>{item.region}</Text>
              </>
            )}
          </View>

          {/* POI match badge */}
          {item.poi_id && (
            <View style={styles.matchBadge}>
              <Ionicons name="checkmark-circle" size={12} color={colors.primary} />
              <Text style={styles.matchText}>
                Matched: {item.poi_name || 'Qiwiosity POI'}
              </Text>
            </View>
          )}

          {/* Notes */}
          {item.notes && (
            <Text style={styles.notes} numberOfLines={2}>{item.notes}</Text>
          )}

          {/* Tags */}
          {item.tags?.length > 0 && (
            <View style={styles.tagsRow}>
              {item.tags.slice(0, 4).map(tag => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>#{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={() => handleDelete(item)}
            style={styles.actionBtn}
          >
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => Linking.openURL(item.url).catch(() => {})}
            style={styles.actionBtn}
          >
            <Ionicons name="open-outline" size={18} color={colors.muted} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // ── Handlers ──────────────────────────────────────────
  function handleToggleVisited(item) {
    wishlist.toggleVisited(item.id).catch(err => {
      Alert.alert('Error', err.message);
    });
  }

  function handleDelete(item) {
    Alert.alert(
      'Remove from wishlist?',
      `"${item.title}" will be removed from your cloud wishlist.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => wishlist.removeItem(item.id).catch(err => Alert.alert('Error', err.message)),
        },
      ]
    );
  }

  // ── Main render ───────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Stats bar */}
      <View style={styles.statsBar}>
        <StatPill value={wishlist.stats.total} label="Saved" color={colors.primary} />
        <StatPill value={wishlist.stats.unvisited} label="To Visit" color={colors.accent} />
        <StatPill value={wishlist.stats.visited} label="Visited" color={colors.success} />
        <StatPill value={wishlist.stats.matched_to_poi} label="In App" color={colors.primaryDark} />
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={colors.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search your wishlist..."
          placeholderTextColor={colors.muted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={colors.muted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter chips */}
      <View style={styles.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="bookmark-outline" size={48} color={colors.border} />
            <Text style={styles.emptyTitle}>
              {filter !== 'all' ? 'No matching items' : 'Your wishlist is empty'}
            </Text>
            <Text style={styles.emptyText}>
              Install the Qiwiosity Chrome extension to save places from anywhere on the web.
            </Text>
          </View>
        }
      />
    </View>
  );
}

function StatPill({ value, label, color }) {
  return (
    <View style={[styles.statPill, { borderColor: color + '30' }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  // Stats
  statsBar: {
    flexDirection: 'row', justifyContent: 'space-around',
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  statPill: {
    alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderRadius: radius.md, borderWidth: 1,
  },
  statValue: { fontSize: 20, fontWeight: '700' },
  statLabel: { fontSize: 10, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Search
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: spacing.lg, marginTop: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.md,
    paddingHorizontal: spacing.md, height: 40,
    borderWidth: 1, borderColor: colors.border,
  },
  searchInput: { flex: 1, marginLeft: spacing.sm, fontSize: 14, color: colors.text },

  // Filters
  filterRow: {
    flexDirection: 'row', paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm, gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderRadius: radius.pill, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
  },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { fontSize: 12, fontWeight: '600', color: colors.muted },
  filterTextActive: { color: '#fff' },

  // List
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },

  // Card
  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    marginTop: spacing.md, overflow: 'hidden',
    borderWidth: 1, borderColor: colors.border,
  },
  cardVisited: { opacity: 0.7 },
  thumb: { width: '100%', height: 140 },
  thumbPlaceholder: {
    width: '100%', height: 80,
    alignItems: 'center', justifyContent: 'center',
  },
  cardBody: { padding: spacing.lg },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { ...type.heading, flex: 1, marginRight: spacing.sm },

  // Meta
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs, gap: 4 },
  metaText: { ...type.caption, fontSize: 11 },
  metaDot: { color: colors.muted, fontSize: 11 },

  // Match badge
  matchBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.primary + '10', borderRadius: radius.sm,
    paddingHorizontal: spacing.sm, paddingVertical: 3,
    marginTop: spacing.xs, alignSelf: 'flex-start',
  },
  matchText: { fontSize: 11, fontWeight: '600', color: colors.primary },

  // Notes
  notes: { ...type.caption, marginTop: spacing.xs, fontStyle: 'italic' },

  // Tags
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: spacing.sm },
  tag: {
    backgroundColor: colors.primary + '10', borderRadius: radius.pill,
    paddingHorizontal: spacing.sm, paddingVertical: 2,
  },
  tagText: { fontSize: 11, color: colors.primary, fontWeight: '500' },

  // Actions
  actions: {
    flexDirection: 'row', justifyContent: 'flex-end',
    borderTopWidth: 1, borderTopColor: colors.border,
    padding: spacing.sm, gap: spacing.md,
  },
  actionBtn: { padding: spacing.xs },

  // Empty
  emptyContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: spacing.xxl, paddingTop: 80,
  },
  emptyTitle: { ...type.heading, marginTop: spacing.lg, textAlign: 'center' },
  emptyText: { ...type.caption, marginTop: spacing.sm, textAlign: 'center', lineHeight: 20 },
});
