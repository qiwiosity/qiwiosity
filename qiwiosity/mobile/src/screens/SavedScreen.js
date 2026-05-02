/**
 * SavedScreen — Combines My Lists (local) and Wishlist (cloud-synced) into
 * a single unified "Saved" tab with segment switching.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  Linking,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMyLists } from '../context/MyListsContext';
import { useWishlist } from '../context/WishlistContext';
import { useData } from '../context/DataContext';
import { colors, spacing, radius, type } from '../theme';

const SEGMENTS = [
  { id: 'lists', label: 'My Lists' },
  { id: 'wishlist', label: 'Web Wishlist' },
];

const SOURCE_ICONS = {
  youtube: { icon: 'logo-youtube', color: '#FF0000' },
  instagram: { icon: 'logo-instagram', color: '#E1306C' },
  facebook: { icon: 'logo-facebook', color: '#1877F2' },
  tiktok: { icon: 'logo-tiktok', color: '#000000' },
  'google-maps': { icon: 'map', color: '#4285F4' },
  tripadvisor: { icon: 'earth', color: '#34E0A1' },
  'tourism-nz': { icon: 'leaf', color: '#15888A' },
  'doc-nz': { icon: 'trail-sign', color: '#2E7D32' },
  blog: { icon: 'document-text', color: '#6B7280' },
  mobile: { icon: 'phone-portrait', color: '#15888A' },
  extension: { icon: 'extension-puzzle', color: '#15888A' },
};

export default function SavedScreen({ navigation }) {
  const [segment, setSegment] = useState('lists');
  const myLists = useMyLists();
  const wishlist = useWishlist();
  const { attractions } = useData();

  // ── My Lists section ──────────────────────────────────────
  const [showCreateList, setShowCreateList] = useState(false);
  const [newListName, setNewListName] = useState('');

  const createList = () => {
    if (!newListName.trim()) return;
    myLists.createList(newListName.trim());
    setNewListName('');
    setShowCreateList(false);
  };

  const deleteList = (list) => {
    Alert.alert('Delete list?', `Remove "${list.name}" and all its saved items?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => myLists.deleteList(list.id) },
    ]);
  };

  const totalListItems = myLists.lists.reduce((sum, l) => sum + l.items.length, 0);

  // ── Wishlist section ──────────────────────────────────────
  const [refreshing, setRefreshing] = useState(false);
  const [wishlistFilter, setWishlistFilter] = useState('all');

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await wishlist.refresh();
    setRefreshing(false);
  }, [wishlist]);

  const filteredWishlistItems = (wishlist.items || []).filter((item) => {
    if (wishlistFilter === 'unvisited') return !item.is_visited;
    if (wishlistFilter === 'visited') return item.is_visited;
    if (wishlistFilter === 'matched') return !!item.poi_id;
    return true;
  });

  // ── Render ────────────────────────────────────────────────

  const renderListCard = ({ item: list }) => (
    <TouchableOpacity
      style={styles.listCard}
      onPress={() => navigation.navigate('ListDetail', { listId: list.id })}
      onLongPress={() => deleteList(list)}
      delayLongPress={600}
    >
      <View style={[styles.listIcon, { backgroundColor: list.color || colors.primary }]}>
        <Ionicons name={list.icon || 'bookmark'} size={20} color="#fff" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.listName}>{list.name}</Text>
        <Text style={type.caption}>
          {list.items.length} place{list.items.length !== 1 ? 's' : ''}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </TouchableOpacity>
  );

  const renderWishlistCard = ({ item }) => {
    const source = SOURCE_ICONS[item.source_site] || SOURCE_ICONS.mobile;
    const matchedPoi = item.poi_id ? attractions.find((a) => a.id === item.poi_id) : null;

    return (
      <TouchableOpacity
        style={styles.wishCard}
        onPress={() => {
          if (matchedPoi) {
            navigation.navigate('AttractionDetail', { id: matchedPoi.id });
          } else if (item.url) {
            Linking.openURL(item.url);
          }
        }}
      >
        {item.thumbnail_url ? (
          <Image source={{ uri: item.thumbnail_url }} style={styles.wishThumb} resizeMode="cover" />
        ) : (
          <View style={[styles.wishThumb, { backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' }]}>
            <Ionicons name="image-outline" size={20} color={colors.muted} />
          </View>
        )}
        <View style={{ flex: 1, padding: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name={source.icon} size={12} color={source.color} />
            <Text style={styles.wishTitle} numberOfLines={1}>{item.title || item.place_name}</Text>
          </View>
          {item.description && (
            <Text style={type.caption} numberOfLines={2}>{item.description}</Text>
          )}
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
            {item.is_visited && (
              <View style={styles.visitedBadge}>
                <Text style={styles.visitedText}>Visited</Text>
              </View>
            )}
            {matchedPoi && (
              <View style={styles.matchedBadge}>
                <Text style={styles.matchedText}>In App</Text>
              </View>
            )}
          </View>
        </View>
        <TouchableOpacity
          style={{ padding: 8 }}
          onPress={() => wishlist.toggleVisited(item.id)}
        >
          <Ionicons
            name={item.is_visited ? 'checkmark-circle' : 'checkmark-circle-outline'}
            size={22}
            color={item.is_visited ? colors.success : colors.muted}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Segment switcher */}
      <View style={styles.segmentRow}>
        {SEGMENTS.map((s) => (
          <TouchableOpacity
            key={s.id}
            style={[styles.segmentBtn, segment === s.id && styles.segmentBtnActive]}
            onPress={() => setSegment(s.id)}
          >
            <Text style={[styles.segmentText, segment === s.id && styles.segmentTextActive]}>
              {s.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {segment === 'lists' ? (
        <View style={{ flex: 1 }}>
          {/* Stats */}
          <View style={styles.statsRow}>
            <Text style={type.caption}>
              {myLists.lists.length} list{myLists.lists.length !== 1 ? 's' : ''} · {totalListItems} saved place{totalListItems !== 1 ? 's' : ''}
            </Text>
            <TouchableOpacity
              style={styles.createBtn}
              onPress={() => setShowCreateList(!showCreateList)}
            >
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={styles.createBtnText}>New List</Text>
            </TouchableOpacity>
          </View>

          {/* Create list inline form */}
          {showCreateList && (
            <View style={styles.createForm}>
              <TextInput
                style={styles.createInput}
                placeholder="List name..."
                placeholderTextColor={colors.muted}
                value={newListName}
                onChangeText={setNewListName}
                autoFocus
                onSubmitEditing={createList}
              />
              <TouchableOpacity style={styles.createSubmit} onPress={createList}>
                <Text style={styles.createSubmitText}>Create</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Lists */}
          <FlatList
            data={myLists.lists}
            keyExtractor={(item) => item.id}
            renderItem={renderListCard}
            contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl }}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="bookmark-outline" size={40} color={colors.border} />
                <Text style={[type.body, { color: colors.muted, marginTop: 12, textAlign: 'center' }]}>
                  No lists yet. Create one to save places you discover.
                </Text>
              </View>
            }
          />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {/* Wishlist filters */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {[
              { key: 'all', label: `All (${wishlist.stats?.total || 0})` },
              { key: 'unvisited', label: `To Visit (${wishlist.stats?.unvisited || 0})` },
              { key: 'visited', label: `Visited (${wishlist.stats?.visited || 0})` },
              { key: 'matched', label: `In App (${wishlist.stats?.matched_to_poi || 0})` },
            ].map((f) => (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterChip, wishlistFilter === f.key && styles.filterChipActive]}
                onPress={() => setWishlistFilter(f.key)}
              >
                <Text style={[styles.filterChipText, wishlistFilter === f.key && styles.filterChipTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {!wishlist.isAuthenticated ? (
            <View style={styles.empty}>
              <Ionicons name="globe-outline" size={40} color={colors.border} />
              <Text style={[type.body, { color: colors.muted, marginTop: 12, textAlign: 'center' }]}>
                Sign in to sync your web wishlist from the Chrome extension.
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredWishlistItems}
              keyExtractor={(item) => item.id}
              renderItem={renderWishlistCard}
              contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl }}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
              }
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Ionicons name="globe-outline" size={40} color={colors.border} />
                  <Text style={[type.body, { color: colors.muted, marginTop: 12, textAlign: 'center' }]}>
                    No wishlist items yet. Use the Chrome extension to save places from the web.
                  </Text>
                </View>
              }
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  segmentRow: {
    flexDirection: 'row',
    margin: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  segmentBtnActive: {
    backgroundColor: colors.primary,
  },
  segmentText: { fontSize: 13, fontWeight: '600', color: colors.text },
  segmentTextActive: { color: '#fff' },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
  },
  createBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  createForm: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  createInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.text,
  },
  createSubmit: {
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.md,
  },
  createSubmitText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  listIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listName: { fontSize: 15, fontWeight: '600', color: colors.text },
  filterRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  filterChip: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText: { fontSize: 12, fontWeight: '600', color: colors.text },
  filterChipTextActive: { color: '#fff' },
  wishCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  wishThumb: { width: 70, height: 70 },
  wishTitle: { fontSize: 13, fontWeight: '600', color: colors.text, flex: 1 },
  visitedBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  visitedText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  matchedBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  matchedText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
});
