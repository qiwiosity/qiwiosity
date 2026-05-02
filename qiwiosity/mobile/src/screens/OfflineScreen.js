import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../context/DataContext';
import {
  precacheRegionAudio, getCachedRegions, clearRegionAudio, hydrateFromNetwork,
} from '../utils/contentCache';
import { colors, radius, spacing, type } from '../theme';

/**
 * Offline manager — lets the user pre-cache a region's audio and
 * metadata before they drive into a dead zone.
 */
export default function OfflineScreen() {
  const { attractions, regions } = useData();
  const [cached, setCached] = useState({});
  const [busy, setBusy] = useState(null); // regionId currently downloading
  const [progress, setProgress] = useState({});

  const refresh = async () => {
    const c = await getCachedRegions();
    setCached(c);
  };

  useEffect(() => {
    refresh();
  }, []);

  const download = async (regionId) => {
    setBusy(regionId);
    setProgress({ [regionId]: { done: 0, total: 0 } });
    const res = await precacheRegionAudio(regionId, {
      onProgress: ({ done, total }) => setProgress({ [regionId]: { done, total } }),
    });
    setBusy(null);
    setProgress({});
    if (!res.ok) {
      Alert.alert('Download failed', res.reason === 'offline' ? 'You need an internet connection to download region audio.' : 'Unexpected error.');
    }
    refresh();
  };

  const remove = async (regionId) => {
    Alert.alert('Remove downloaded audio?', 'You can download it again later.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        await clearRegionAudio(regionId);
        refresh();
      }},
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.intro}>
        Download regions before you drive into rural areas — Qiwiosity
        will keep playing stories even without signal.
      </Text>

      <TouchableOpacity
        style={styles.refreshBtn}
        onPress={async () => {
          const r = await hydrateFromNetwork();
          Alert.alert(
            'Content sync',
            r.status === 'updated' ? `Downloaded ${r.count} places.`
              : r.status === 'unchanged' ? 'Already up to date.'
              : 'Offline — using the last downloaded version.'
          );
        }}
      >
        <Ionicons name="cloud-download" size={18} color={colors.primary} />
        <Text style={{ color: colors.primary, fontWeight: '700', marginLeft: 6 }}>Sync content now</Text>
      </TouchableOpacity>

      <FlatList
        data={regions}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ padding: spacing.md, paddingTop: 0 }}
        renderItem={({ item }) => {
          const count = attractions.filter((a) => a.region === item.id).length;
          const isCached = !!cached[item.id];
          const downloading = busy === item.id;
          const prog = progress[item.id];
          return (
            <View style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={type.heading}>{item.name}</Text>
                <Text style={type.caption}>
                  {count} places · {item.island} Island
                  {isCached ? ` · downloaded ${new Date(cached[item.id].at).toLocaleDateString()}` : ''}
                </Text>
                {downloading && prog && prog.total > 0 && (
                  <Text style={[type.caption, { marginTop: 4 }]}>
                    Downloading {prog.done} / {prog.total}…
                  </Text>
                )}
              </View>
              {downloading ? (
                <ActivityIndicator color={colors.primary} />
              ) : isCached ? (
                <TouchableOpacity onPress={() => remove(item.id)} hitSlop={10}>
                  <Ionicons name="trash-outline" size={22} color={colors.danger} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={() => download(item.id)} style={styles.dlBtn}>
                  <Ionicons name="cloud-download" size={18} color="#fff" />
                  <Text style={styles.dlText}>Download</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  intro: {
    ...type.body,
    color: colors.muted,
    padding: spacing.md,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: '#fff',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  dlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.md,
  },
  dlText: { color: '#fff', fontWeight: '700' },
});
