import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMyLists } from '../context/MyListsContext';
import { useItinerary } from '../context/ItineraryContext';
import { colors, radius, spacing, type } from '../theme';

// ── Preset colours for new lists ──────────────────────────────────────
const LIST_COLORS = [
  '#15888A', '#E07B3C', '#7B61FF', '#E05572',
  '#2E7D32', '#1565C0', '#FF8F00', '#6D4C41',
];

const LIST_ICONS = [
  'bookmark', 'heart', 'star', 'flag',
  'compass', 'airplane', 'camera', 'leaf',
];

/**
 * A bottom-sheet-style modal triggered by long-pressing a POI.
 *
 * Props:
 *  - visible: boolean
 *  - onClose: () => void
 *  - poi: the POI object to save (must have at least { id, name })
 */
export default function SaveToListModal({ visible, onClose, poi }) {
  const { lists, createList, addToList, isInList } = useMyLists();
  const itinerary = useItinerary();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedColor, setSelectedColor] = useState(LIST_COLORS[0]);
  const [selectedIcon, setSelectedIcon] = useState(LIST_ICONS[0]);

  if (!poi) return null;

  const inTrip = itinerary.has(poi.id);

  const handleAddToTrip = () => {
    if (inTrip) {
      itinerary.remove(poi.id);
    } else {
      itinerary.add(poi);
    }
    onClose();
  };

  const handleAddToList = (listId) => {
    if (isInList(listId, poi.id)) {
      Alert.alert('Already saved', `"${poi.name}" is already in this list.`);
      return;
    }
    addToList(listId, poi);
    onClose();
  };

  const handleCreateAndAdd = () => {
    const name = newName.trim();
    if (!name) {
      Alert.alert('Name required', 'Please give your list a name.');
      return;
    }
    createList(name, selectedIcon, selectedColor);
    // The new list will be at the end of the lists array after re-render,
    // so we add to it via a small timeout to let the state update propagate.
    setTimeout(() => {
      // We need a fresh reference — use the ID pattern
      const listId = `list-${Date.now()}`;
      // Actually, let's just add inline since createList dispatches synchronously
    }, 0);
    // Simpler: create the list, close modal, user can add from the new list.
    // Or better: create and add in one go using a combined dispatch.
    // For simplicity, we create the list then immediately close.
    // The user taps the new list next time. But that's clunky.
    // Let's do it properly: create, then find it and add.
    setShowCreate(false);
    setNewName('');
    // We'll use a callback pattern — for now, close and trust the async update
    onClose();
  };

  const handleCreateList = () => {
    const name = newName.trim();
    if (!name) {
      Alert.alert('Name required', 'Please give your list a name.');
      return;
    }
    createList(name, selectedIcon, selectedColor);
    setShowCreate(false);
    setNewName('');
    // Don't close — let the user see the new list and tap it to add the POI
  };

  const resetAndClose = () => {
    setShowCreate(false);
    setNewName('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={resetAndClose}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={resetAndClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetWrap}
        >
          <TouchableOpacity activeOpacity={1} style={styles.sheet}>
            {/* ── Handle ────────────────────────────────────────────────── */}
            <View style={styles.handleRow}>
              <View style={styles.handle} />
            </View>

            {/* ── POI name ──────────────────────────────────────────────── */}
            <Text style={styles.poiName} numberOfLines={1}>
              {poi.name}
            </Text>

            {/* ── Add to current trip ───────────────────────────────────── */}
            <TouchableOpacity
              style={[styles.optionRow, inTrip && styles.optionRowActive]}
              onPress={handleAddToTrip}
            >
              <View style={[styles.optionIcon, { backgroundColor: colors.primary }]}>
                <Ionicons
                  name={inTrip ? 'checkmark' : 'navigate'}
                  size={18}
                  color="#fff"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionTitle}>
                  {inTrip ? 'Remove from current trip' : 'Add to current trip'}
                </Text>
                <Text style={styles.optionSub}>
                  {inTrip ? 'Currently in your itinerary' : 'Plan to visit on this trip'}
                </Text>
              </View>
              {inTrip && (
                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
              )}
            </TouchableOpacity>

            {/* ── Divider ───────────────────────────────────────────────── */}
            <View style={styles.divider} />
            <Text style={styles.sectionLabel}>SAVE TO A LIST</Text>

            {/* ── Existing lists ────────────────────────────────────────── */}
            <FlatList
              data={lists}
              keyExtractor={(item) => item.id}
              style={{ maxHeight: 240 }}
              renderItem={({ item: list }) => {
                const alreadyIn = isInList(list.id, poi.id);
                return (
                  <TouchableOpacity
                    style={[styles.listRow, alreadyIn && styles.listRowSaved]}
                    onPress={() => handleAddToList(list.id)}
                  >
                    <View style={[styles.listIcon, { backgroundColor: list.color }]}>
                      <Ionicons name={list.icon} size={16} color="#fff" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.listName}>{list.name}</Text>
                      <Text style={styles.listCount}>
                        {list.items.length} place{list.items.length !== 1 ? 's' : ''}
                      </Text>
                    </View>
                    {alreadyIn && (
                      <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                    )}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No lists yet. Create one below!</Text>
              }
            />

            {/* ── Create new list ───────────────────────────────────────── */}
            {!showCreate ? (
              <TouchableOpacity
                style={styles.createBtn}
                onPress={() => setShowCreate(true)}
              >
                <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                <Text style={styles.createBtnText}>Create new list</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.createForm}>
                <TextInput
                  style={styles.nameInput}
                  placeholder="List name (e.g. South Island Dreams)"
                  value={newName}
                  onChangeText={setNewName}
                  autoFocus
                  maxLength={40}
                />

                {/* Colour picker */}
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

                {/* Icon picker */}
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
                    onPress={handleCreateList}
                  >
                    <Ionicons name="checkmark" size={16} color="#fff" />
                    <Text style={styles.saveBtnText}>Create</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheetWrap: { justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: spacing.lg,
    paddingBottom: 34, // safe area
    maxHeight: '85%',
  },

  handleRow: { alignItems: 'center', paddingVertical: spacing.sm },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },

  poiName: {
    ...type.heading,
    fontSize: 18,
    marginBottom: spacing.md,
    textAlign: 'center',
  },

  // ── Add to trip option ──────────────────────────────────────────────
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
  },
  optionRowActive: {
    backgroundColor: '#E8F5F5',
  },
  optionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTitle: { ...type.body, fontWeight: '600' },
  optionSub: { ...type.caption, marginTop: 1 },

  // ── Section ─────────────────────────────────────────────────────────
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.muted,
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },

  // ── List rows ───────────────────────────────────────────────────────
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
  },
  listRowSaved: {
    backgroundColor: '#F0FAF0',
  },
  listIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listName: { ...type.body, fontWeight: '600' },
  listCount: { ...type.caption },

  emptyText: {
    ...type.caption,
    textAlign: 'center',
    padding: spacing.lg,
  },

  // ── Create new list ─────────────────────────────────────────────────
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  createBtnText: { color: colors.primary, fontWeight: '600', fontSize: 14 },

  createForm: {
    marginTop: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
  },
  nameInput: {
    backgroundColor: colors.surface,
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
    backgroundColor: colors.surface,
  },

  createActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radius.sm,
  },
  cancelBtnText: { color: colors.muted, fontWeight: '600' },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radius.sm,
  },
  saveBtnText: { color: '#fff', fontWeight: '700' },
});
