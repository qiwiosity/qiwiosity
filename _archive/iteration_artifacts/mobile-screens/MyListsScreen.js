import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMyLists } from '../context/MyListsContext';
import { colors, radius, spacing, type } from '../theme';

const LIST_COLORS = [
  '#15888A', '#E07B3C', '#7B61FF', '#E05572',
  '#2E7D32', '#1565C0', '#FF8F00', '#6D4C41',
];

const LIST_ICONS = [
  'bookmark', 'heart', 'star', 'flag',
  'compass', 'airplane', 'camera', 'leaf',
];

export default function MyListsScreen({ navigation }) {
  const { lists, createList, deleteList, renameList } = useMyLists();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedColor, setSelectedColor] = useState(LIST_COLORS[0]);
  const [selectedIcon, setSelectedIcon] = useState(LIST_ICONS[0]);

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) {
      Alert.alert('Name required', 'Please give your list a name.');
      return;
    }
    createList(name, selectedIcon, selectedColor);
    setShowCreate(false);
    setNewName('');
    setSelectedColor(LIST_COLORS[0]);
    setSelectedIcon(LIST_ICONS[0]);
  };

  const confirmDelete = (list) => {
    Alert.alert(
      `Delete "${list.name}"?`,
      `This will remove the list and all ${list.items.length} saved places.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteList(list.id),
        },
      ],
    );
  };

  const totalSaved = lists.reduce((sum, l) => sum + l.items.length, 0);

  return (
    <View style={styles.container}>
      {/* ── Header stats ──────────────────────────────────────────────── */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{lists.length}</Text>
          <Text style={styles.statLabel}>Lists</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{totalSaved}</Text>
          <Text style={styles.statLabel}>Saved places</Text>
        </View>
      </View>

      {/* ── Lists ─────────────────────────────────────────────────────── */}
      <FlatList
        data={lists}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 120 }}
        renderItem={({ item: list }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('ListDetail', { listId: list.id })}
            onLongPress={() => confirmDelete(list)}
          >
            <View style={[styles.cardIcon, { backgroundColor: list.color }]}>
              <Ionicons name={list.icon} size={22} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={type.heading}>{list.name}</Text>
              <Text style={type.caption}>
                {list.items.length} place{list.items.length !== 1 ? 's' : ''}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.muted} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="bookmark-outline" size={48} color={colors.border} />
            <Text style={styles.emptyText}>No lists yet</Text>
            <Text style={styles.emptyHint}>
              Create a list to start saving places you want to visit.
            </Text>
          </View>
        }
      />

      {/* ── Create new list panel ���─────────────────────────��──────────── */}
      {showCreate ? (
        <View style={styles.createPanel}>
          <TextInput
            style={styles.nameInput}
            placeholder="List name (e.g. South Island Dreams)"
            value={newName}
            onChangeText={setNewName}
            autoFocus
            maxLength={40}
          />

          <Text style={styles.pickerLabel}>Colour</Text>
          <View style={styles.pickerRow}>
            {LIST_COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                onPress={() => setSelectedColor(c)}
                style={[
                  styles.colorDot,
                  { backgroundColor: c },
                  selectedColor === c && styles.colorDotSelected,
                ]}
              />
            ))}
          </View>

          <Text style={styles.pickerLabel}>Icon</Text>
          <View style={styles.pickerRow}>
            {LIST_ICONS.map((ic) => (
              <TouchableOpacity
                key={ic}
                onPress={() => setSelectedIcon(ic)}
                style={[
                  styles.iconOption,
                  selectedIcon === ic && { backgroundColor: selectedColor, borderColor: selectedColor },
                ]}
              >
                <Ionicons
                  name={ic}
                  size={18}
                  color={selectedIcon === ic ? '#fff' : colors.muted}
                />
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.createActions}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => { setShowCreate(false); setNewName(''); }}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: selectedColor }]}
              onPress={handleCreate}
            >
              <Ionicons name="checkmark" size={16} color="#fff" />
              <Text style={styles.saveBtnText}>Create list</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowCreate(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  // ── Stats ───────────────────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.md,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statNum: { ...type.title, color: colors.primary },
  statLabel: { ...type.caption, marginTop: 2 },

  // ── Cards ───────��───────────────────────────────────────────────────
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Empty ──────────────────────────────────────��────────────────────
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
    marginTop: 40,
  },
  emptyText: { ...type.heading, color: colors.muted },
  emptyHint: { ...type.caption, textAlign: 'center' },

  // ── Create panel ───────────��────────────────────────────────────────
  createPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    paddingBottom: 34,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
  nameInput: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: spacing.md,
  },
  pickerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.muted,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  pickerRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.md,
    flexWrap: 'wrap',
  },
  colorDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorDotSelected: {
    borderColor: colors.text,
    borderWidth: 3,
  },
  iconOption: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  createActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: radius.sm,
  },
  cancelBtnText: { color: colors.muted, fontWeight: '600' },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: radius.sm,
  },
  saveBtnText: { color: '#fff', fontWeight: '700' },

  // ── FAB ──��──────────────────────────���───────────────────────────��───
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
});
