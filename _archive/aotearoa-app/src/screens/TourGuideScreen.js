import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import * as Speech from 'expo-speech';
import attractions from '../data/attractions.json';
import { colors, radius, spacing, type } from '../theme';

export default function TourGuideScreen() {
  const [playing, setPlaying] = useState(null);

  const speak = (a) => {
    Speech.stop();
    setPlaying(a.id);
    Speech.speak(`${a.name}. ${a.commentary}`, {
      rate: 0.95,
      pitch: 1,
      onDone: () => setPlaying(null),
      onStopped: () => setPlaying(null),
    });
  };

  const stop = () => {
    Speech.stop();
    setPlaying(null);
  };

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
          const active = playing === item.id;
          return (
            <TouchableOpacity
              onPress={() => (active ? stop() : speak(item))}
              style={[styles.card, active && styles.cardActive]}
            >
              <View style={styles.playCircle}>
                <Text style={{ color: 'white', fontSize: 14 }}>{active ? '■' : '▶'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={type.heading}>{item.name}</Text>
                <Text style={type.caption} numberOfLines={2}>
                  {item.commentary}
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
});
