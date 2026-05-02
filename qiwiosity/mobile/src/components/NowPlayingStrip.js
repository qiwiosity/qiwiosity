import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSharedNarration } from '../context/NarrationContext';
import { useData } from '../context/DataContext';
import { colors, radius, spacing, type } from '../theme';

/**
 * A persistent "Now Playing" strip that renders above the tab bar while
 * narration is playing. Tapping the title jumps to the POI's detail
 * screen; the right-hand button stops playback.
 *
 * Renders nothing when nothing is playing.
 */
export default function NowPlayingStrip({ navigation }) {
  const { playing, stop } = useSharedNarration();
  const { attractions } = useData();
  if (!playing) return null;

  const attraction = attractions.find((a) => a.id === playing.id);
  if (!attraction) return null;

  const open = () => {
    if (!navigation) return;
    try {
      navigation.navigate('Explore', {
        screen: 'AttractionDetail',
        params: { id: attraction.id },
      });
    } catch {
      navigation.navigate('AttractionDetail', { id: attraction.id });
    }
  };

  return (
    <View style={styles.wrap}>
      <TouchableOpacity style={styles.body} onPress={open} activeOpacity={0.85}>
        <Ionicons name="headset" size={20} color="#fff" />
        <View style={{ flex: 1, marginLeft: spacing.sm }}>
          <Text style={styles.title} numberOfLines={1}>{attraction.name}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {playing.length === 'headline' ? 'Headline' : 'Standard'} · Now playing
          </Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity style={styles.stop} onPress={stop} hitSlop={10}>
        <Ionicons name="stop" size={18} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
  },
  body: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  title: { ...type.heading, color: '#fff', fontSize: 14 },
  subtitle: { ...type.caption, color: '#fff', opacity: 0.85, fontSize: 11 },
  stop: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
});
