import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useData } from '../context/DataContext';
import useNarration from '../hooks/useNarration';
import { hasBundledAudio } from '../utils/audio';
import { colors, radius, spacing, type } from '../theme';

export default function TourGuideScreen() {
  const { attractions } = useData();
  const { playing, toggle } = useNarration();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={type.title}>Tour Guide</Text>
        <Text style={[type.caption, { marginTop: 4 }]}>
          Tap any track to play its audio commentary
        </Text>
      </View>

      <FlatList
        data={attractions}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 100 }}
        renderItem={({ item }) => {
          const active = playing && playing.id === item.id;
          const bundled = hasBundledAudio(item.id, 'standard');
          return (
            <TouchableOpacity
              onPress={() => toggle(item, 'standard')}
              style={[styles.card, active && styles.cardActive]}
            >
              <View style={[styles.playCircle, active && styles.playCircleActive]}>
                <Text style={{ color: 'white', fontSize: 14 }}>
                  {active ? '■' : '▶'}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={type.heading}>{item.name}</Text>
                <Text style={type.caption} numberOfLines={2}>
                  {item.commentary}
                </Text>
                <Text style={styles.sourceTag}>
                  {bundled ? 'STUDIO AUDIO' : 'ON-DEVICE VOICE'}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingTop: 50, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardActive: { borderColor: colors.primary, backgroundColor: '#EEF5F2' },
  playCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  playCircleActive: { backgroundColor: colors.danger },
  sourceTag: {
    fontSize: 9,
    letterSpacing: 1.2,
    fontWeight: '700',
    color: colors.muted,
    marginTop: 4,
  },
});
