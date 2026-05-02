import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCompare } from '../context/CompareContext';
import { useData } from '../context/DataContext';
import { colors, radius, spacing, type as typeStyles } from '../theme';

// --- Utility: generate all unique pairs (round-robin) in shuffled order ---
function buildPairs(items) {
  const pairs = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      pairs.push({ a: items[i], b: items[j] });
    }
  }
  // Fisher-Yates shuffle
  for (let i = pairs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
  }
  return pairs;
}

export default function DecisionScreen({ route, navigation }) {
  const { groupName, itemIds } = route.params;
  const compare = useCompare();
  const { categories, regions } = useData();

  const catLabel = (id) => categories.find((c) => c.id === id)?.label || id;
  const catColor = (id) => categories.find((c) => c.id === id)?.color || colors.primary;
  const regionName = (id) => regions.find((r) => r.id === id)?.name || id;

  // Resolve items from compare list by IDs
  const items = useMemo(
    () => itemIds.map((id) => compare.items.find((x) => x.id === id)).filter(Boolean),
    [itemIds, compare.items]
  );

  // --- State machine: 'pick' → 'comparing' → 'results' ---
  const [phase, setPhase] = useState('pick'); // 'pick' | 'comparing' | 'results'
  const [keepCount, setKeepCount] = useState(1);
  const [pairs, setPairs] = useState([]);
  const [pairIdx, setPairIdx] = useState(0);
  const [scores, setScores] = useState({});

  const startComparing = useCallback(
    (k) => {
      setKeepCount(k);
      const newPairs = buildPairs(items);
      setPairs(newPairs);
      setPairIdx(0);
      const init = {};
      items.forEach((a) => (init[a.id] = 0));
      setScores(init);
      setPhase('comparing');
    },
    [items]
  );

  const pickPreference = useCallback(
    (winnerId) => {
      setScores((prev) => ({ ...prev, [winnerId]: (prev[winnerId] || 0) + 1 }));
      if (pairIdx + 1 >= pairs.length) {
        // use a timeout so the score state update settles
        setTimeout(() => setPhase('results'), 200);
      } else {
        setPairIdx((i) => i + 1);
      }
    },
    [pairIdx, pairs]
  );

  const restart = () => setPhase('pick');

  // --- Rankings ---
  const ranked = useMemo(() => {
    return [...items].sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0));
  }, [items, scores]);

  const maxPossibleWins = items.length - 1;

  // ==================== RENDER: PICK COUNT ====================
  if (phase === 'pick') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg }}>
        <View style={styles.promptBox}>
          <Text style={styles.promptTitle}>How many do you want to keep?</Text>
          <Text style={styles.promptSub}>
            Every option gets compared against every other — completely fair
          </Text>
        </View>

        {Array.from({ length: items.length - 1 }, (_, i) => i + 1).map((k) => (
          <TouchableOpacity key={k} style={styles.pickCard} onPress={() => startComparing(k)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.pickLabel}>
                {k === 1 ? 'Find the single best' : `Pick the best ${k}`}
              </Text>
              <Text style={typeStyles.caption}>out of {items.length} options</Text>
            </View>
            <Text style={{ fontSize: 22, opacity: 0.25 }}>{k === 1 ? '🏆' : '🎯'}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  }

  // ==================== RENDER: COMPARING ====================
  if (phase === 'comparing') {
    const total = pairs.length;
    const progress = ((pairIdx + 1) / total) * 100;
    const pair = pairs[pairIdx];

    if (!pair) return null;

    const renderVsCard = (item, onPress) => {
      const cat = catColor(item.category);
      return (
        <TouchableOpacity style={styles.vsCard} activeOpacity={0.7} onPress={onPress}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <View style={[styles.vsStripe, { backgroundColor: cat }]} />
            <Text style={styles.vsName}>{item.name}</Text>
          </View>
          <Text style={styles.vsMeta}>
            {regionName(item.region)} · {item.duration_hours || '?'}h · {catLabel(item.category)}
          </Text>
          <Text style={styles.vsDesc}>{item.short}</Text>
          <View style={styles.vsStats}>
            {item.review_rating ? (
              <Text style={styles.vsStat}>
                <Text style={styles.vsStatBold}>★ {item.review_rating}</Text> rating
              </Text>
            ) : null}
            <Text style={styles.vsStat}>
              <Text style={styles.vsStatBold}>{item.duration_hours || '?'}h</Text> duration
            </Text>
          </View>
        </TouchableOpacity>
      );
    };

    return (
      <View style={styles.container}>
        {/* Progress */}
        <View style={styles.progressWrap}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>{Math.round(progress)}% through your decision</Text>
        </View>

        <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
          <View style={styles.promptBox}>
            <Text style={styles.promptTitle}>Which do you prefer?</Text>
            <Text style={styles.promptSub}>
              Picking {keepCount === 1 ? 'the best' : `the best ${keepCount}`} from{' '}
              {items.length}
            </Text>
          </View>

          {renderVsCard(pair.a, () => pickPreference(pair.a.id))}

          <View style={styles.vsDivider}>
            <View style={styles.vsBadge}>
              <Text style={styles.vsBadgeText}>VS</Text>
            </View>
          </View>

          {renderVsCard(pair.b, () => pickPreference(pair.b.id))}
        </ScrollView>
      </View>
    );
  }

  // ==================== RENDER: RESULTS ====================
  const kept = ranked.slice(0, keepCount);
  const rest = ranked.slice(keepCount);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg }}>
      <View style={{ alignItems: 'center', marginBottom: 20 }}>
        <Text style={{ fontSize: 48 }}>{keepCount === 1 ? '🏆' : '🎯'}</Text>
        <Text style={styles.resultLabel}>
          {keepCount === 1 ? 'YOUR WINNER' : `YOUR TOP ${keepCount}`}
        </Text>
        <Text style={typeStyles.caption}>Ranked by your preferences</Text>
      </View>

      <Text style={styles.sectionLabel}>CHOSEN ({kept.length})</Text>
      {kept.map((a, i) => {
        const score = scores[a.id] || 0;
        const barWidth = maxPossibleWins > 0 ? Math.round((score / maxPossibleWins) * 100) : 0;
        return (
          <View key={a.id} style={styles.resultCard}>
            <Text style={styles.resultRank}>{i + 1}</Text>
            <View style={[styles.resultStrip, { backgroundColor: catColor(a.category) }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.resultName}>{a.name}</Text>
              <Text style={typeStyles.caption}>
                {regionName(a.region)} · {catLabel(a.category)}
              </Text>
              <View style={styles.resultBarWrap}>
                <View style={styles.resultBarTrack}>
                  <View style={[styles.resultBarFill, { width: `${barWidth}%` }]} />
                </View>
                <Text style={styles.resultScore}>{score} wins</Text>
              </View>
            </View>
            <Text style={{ fontSize: 16 }}>{i === 0 ? '🏆' : '✅'}</Text>
          </View>
        );
      })}

      {rest.length > 0 && (
        <>
          <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>
            DIDN'T MAKE THE CUT
          </Text>
          {rest.map((a, i) => (
            <View key={a.id} style={[styles.resultCard, { opacity: 0.5, borderColor: colors.border }]}>
              <Text style={[styles.resultRank, { color: colors.muted }]}>
                {keepCount + i + 1}
              </Text>
              <View style={[styles.resultStrip, { backgroundColor: catColor(a.category) }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.resultName}>{a.name}</Text>
                <Text style={typeStyles.caption}>
                  {regionName(a.region)} · {scores[a.id] || 0} wins
                </Text>
              </View>
            </View>
          ))}
        </>
      )}

      <View style={styles.resultActions}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.primary }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.actionBtnText}>Done</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { borderWidth: 1, borderColor: colors.primary }]}
          onPress={restart}
        >
          <Text style={[styles.actionBtnText, { color: colors.primary }]}>Redo</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  promptBox: { alignItems: 'center', marginBottom: spacing.lg },
  promptTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
  promptSub: { fontSize: 13, color: colors.muted, textAlign: 'center', marginTop: 4 },
  // --- Pick phase ---
  pickCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  pickLabel: { fontSize: 16, fontWeight: '600' },
  // --- Progress ---
  progressWrap: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  progressTrack: { height: 4, backgroundColor: colors.border, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.accent, borderRadius: 2 },
  progressText: { fontSize: 11, color: colors.muted, marginTop: 4 },
  // --- VS cards ---
  vsCard: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  vsStripe: { width: 4, height: 22, borderRadius: 2 },
  vsName: { fontSize: 17, fontWeight: '700' },
  vsMeta: { fontSize: 12, color: colors.muted, marginBottom: 8 },
  vsDesc: { fontSize: 13, lineHeight: 20 },
  vsStats: { flexDirection: 'row', gap: 16, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border },
  vsStat: { fontSize: 12, color: colors.muted },
  vsStatBold: { fontWeight: '600', color: colors.primaryDark },
  vsDivider: { alignItems: 'center', paddingVertical: 6 },
  vsBadge: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  vsBadgeText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  // --- Results ---
  resultLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 1.5, color: colors.accent, marginTop: 4 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: colors.muted, letterSpacing: 0.5, marginBottom: spacing.sm },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: radius.md,
    marginBottom: spacing.xs,
  },
  resultRank: { fontSize: 18, fontWeight: '700', color: colors.primary, minWidth: 24, textAlign: 'center' },
  resultStrip: { width: 4, height: 32, borderRadius: 2 },
  resultName: { fontSize: 14, fontWeight: '600' },
  resultBarWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  resultBarTrack: { flex: 1, height: 4, backgroundColor: colors.border, borderRadius: 2, overflow: 'hidden' },
  resultBarFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 2 },
  resultScore: { fontSize: 11, fontWeight: '600', color: colors.primary },
  resultActions: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginTop: spacing.xl, marginBottom: spacing.xxl },
  actionBtn: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: radius.md },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
