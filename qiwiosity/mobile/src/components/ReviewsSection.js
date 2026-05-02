/**
 * ReviewsSection — static reviews for a POI
 *
 * Reads `reviews.rating` and `reviews.summary` directly from the POI object.
 * Data is pre-populated in the content JSON files by tools/populate-reviews.cjs.
 * No network calls, no API keys required at runtime.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius, type } from '../theme';

// ── Star renderer ──────────────────────────────────────────────────────────
function Stars({ rating }) {
  const full  = Math.floor(rating);
  const half  = rating - full >= 0.4;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    <Text style={styles.stars}>
      {'★'.repeat(full)}{half ? '½' : ''}{'☆'.repeat(empty)}
    </Text>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function ReviewsSection({ poi }) {
  if (!poi?.reviews?.rating || !poi?.reviews?.summary) return null;

  const { rating, summary } = poi.reviews;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>⭐ Visitor Reviews</Text>

      {/* Rating row */}
      <View style={styles.ratingRow}>
        <Text style={styles.ratingNumber}>{rating.toFixed(1)}</Text>
        <View style={styles.ratingRight}>
          <Stars rating={rating} />
          <Text style={type.caption}>Google rating</Text>
        </View>
      </View>

      {/* AI Overview */}
      <View style={styles.aiBox}>
        <View style={styles.aiBoxHeader}>
          <Text style={styles.aiBoxLabel}>✦ AI OVERVIEW</Text>
          <Text style={styles.aiBoxSub}>Synthesised from visitor reviews</Text>
        </View>
        <Text style={styles.aiBoxText}>{summary}</Text>
      </View>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  section: {
    marginTop: spacing.xxl,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },

  // Rating row
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  ratingNumber: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 44,
    marginRight: spacing.md,
  },
  ratingRight: {
    gap: 2,
  },
  stars: {
    fontSize: 18,
    color: '#F5A623',
    letterSpacing: 1,
  },

  // AI Overview box
  aiBox: {
    backgroundColor: '#F0F8F8',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary + '40',
    padding: spacing.md,
  },
  aiBoxHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  aiBoxLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 1.4,
  },
  aiBoxSub: {
    fontSize: 10,
    color: colors.muted,
  },
  aiBoxText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 22,
  },
});
