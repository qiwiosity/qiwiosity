import React from 'react';
import {
  View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePreferences } from '../context/PreferencesContext';
import {
  startBackgroundGeofencing, stopBackgroundGeofencing,
} from '../hooks/useGeofence';
import { useData } from '../context/DataContext';
import { colors, radius, spacing, type } from '../theme';

const VOICE_OPTIONS = [
  { id: 'bundled-mp3',   label: 'Studio (bundled)',     note: 'Best — hand-recorded or TTS-rendered' },
  { id: 'apple-default', label: 'On-device voice',      note: "Uses iOS's built-in speech synthesis" },
];

const LENGTH_OPTIONS = [
  { id: 'headline', label: 'Headline',  note: '20–30 seconds — just the anchor fact' },
  { id: 'standard', label: 'Standard',  note: '45–90 seconds — full commentary' },
];

export default function SettingsScreen({ navigation }) {
  const { regions } = useData();
  const prefs = usePreferences();

  const toggleDriveMode = async (value) => {
    prefs.set('driveMode', value);
    if (value) {
      const ok = await startBackgroundGeofencing();
      if (!ok) {
        Alert.alert(
          'Background location needed',
          'Drive mode needs "Always allow" location permission to play stories while the screen is off.'
        );
        prefs.set('driveMode', false);
      }
    } else {
      await stopBackgroundGeofencing();
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: spacing.xl }}>
      <Section title="Driving">
        <ToggleRow
          icon="car"
          title="Drive mode"
          subtitle="Keep listening for stops in the background while you drive."
          value={prefs.driveMode}
          onValueChange={toggleDriveMode}
        />
        <ToggleRow
          icon="play"
          title="Autoplay on arrival"
          subtitle="Start the narration automatically when you enter a point of interest."
          value={prefs.storyAutoPlay}
          onValueChange={(v) => prefs.set('storyAutoPlay', v)}
        />
      </Section>

      <Section title="Voice">
        {VOICE_OPTIONS.map((opt) => (
          <OptionRow
            key={opt.id}
            title={opt.label}
            subtitle={opt.note}
            selected={prefs.voice === opt.id}
            onPress={() => prefs.set('voice', opt.id)}
          />
        ))}
      </Section>

      <Section title="Story length">
        {LENGTH_OPTIONS.map((opt) => (
          <OptionRow
            key={opt.id}
            title={opt.label}
            subtitle={opt.note}
            selected={prefs.audioLength === opt.id}
            onPress={() => prefs.set('audioLength', opt.id)}
          />
        ))}
      </Section>

      <Section title="Home region">
        {regions.map((r) => (
          <OptionRow
            key={r.id}
            title={r.name}
            subtitle={`${r.island} Island`}
            selected={prefs.homeRegion === r.id}
            onPress={() => prefs.set('homeRegion', r.id)}
          />
        ))}
      </Section>

      <Section title="Offline">
        <TouchableOpacity
          style={styles.row}
          onPress={() => navigation && navigation.navigate('Offline')}
        >
          <Ionicons name="cloud-download" size={22} color={colors.primary} style={{ width: 28 }} />
          <View style={{ flex: 1 }}>
            <Text style={type.heading}>Manage downloads</Text>
            <Text style={type.caption}>Pre-download regions for when you're out of signal.</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </TouchableOpacity>
      </Section>

      <Section title="Units">
        <OptionRow
          title="Metric"
          subtitle="Kilometres, metres"
          selected={prefs.units === 'metric'}
          onPress={() => prefs.set('units', 'metric')}
        />
        <OptionRow
          title="Imperial"
          subtitle="Miles, feet"
          selected={prefs.units === 'imperial'}
          onPress={() => prefs.set('units', 'imperial')}
        />
      </Section>

      <TouchableOpacity style={styles.reset} onPress={prefs.reset}>
        <Text style={styles.resetText}>Reset all settings</Text>
      </TouchableOpacity>

      <Text style={styles.footer}>
        Qiwiosity · v{require('../../package.json').version} · build Stage A
      </Text>
    </ScrollView>
  );
}

function Section({ title, children }) {
  return (
    <View style={{ marginTop: spacing.lg }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function ToggleRow({ icon, title, subtitle, value, onValueChange }) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={22} color={colors.primary} style={{ width: 28 }} />
      <View style={{ flex: 1 }}>
        <Text style={type.heading}>{title}</Text>
        {!!subtitle && <Text style={type.caption}>{subtitle}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#ccc', true: colors.primary }}
      />
    </View>
  );
}

function OptionRow({ title, subtitle, selected, onPress }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress}>
      <View style={{ flex: 1 }}>
        <Text style={type.heading}>{title}</Text>
        {!!subtitle && <Text style={type.caption}>{subtitle}</Text>}
      </View>
      {selected && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  sectionTitle: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
    ...type.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionBody: {
    marginHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  reset: {
    margin: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.danger,
    alignItems: 'center',
  },
  resetText: { color: colors.danger, fontWeight: '700' },
  footer: {
    textAlign: 'center',
    ...type.caption,
    marginTop: spacing.md,
  },
});
