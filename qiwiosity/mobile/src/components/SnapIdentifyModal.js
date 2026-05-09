import React, { useState } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, SafeAreaView, ScrollView, Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { snapIdentify } from '../lib/railwayApi';
import { colors, radius, spacing, type } from '../theme';

const CONFIDENCE_COLORS = { high: '#2E7D32', medium: '#E65100', low: '#B71C1C' };

export default function SnapIdentifyModal({ visible, onClose }) {
  const [phase, setPhase] = useState('pick'); // 'pick' | 'loading' | 'result' | 'error'
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const reset = () => {
    setPhase('pick');
    setResult(null);
    setErrorMsg('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const runIdentify = async (dataUrl) => {
    setPhase('loading');
    try {
      const r = await snapIdentify({ imageDataUrl: dataUrl });
      setResult(r);
      setPhase('result');
    } catch (e) {
      setErrorMsg(e.message || 'Could not identify the image');
      setPhase('error');
    }
  };

  const pickImage = async (source) => {
    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Camera access needed', 'Please allow camera access in your device settings.');
        return;
      }
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Photo library access needed', 'Please allow photo library access in your device settings.');
        return;
      }
    }

    const opts = {
      base64: true,
      quality: 0.75,
      allowsEditing: true,
      aspect: [4, 3],
    };

    const res = source === 'camera'
      ? await ImagePicker.launchCameraAsync(opts)
      : await ImagePicker.launchImageLibraryAsync({
          ...opts,
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
        });

    if (res.canceled || !res.assets?.[0]?.base64) return;

    const asset = res.assets[0];
    const mime = asset.mimeType || 'image/jpeg';
    const ext = mime.replace('image/', '');
    const safeExt = ['jpeg', 'png', 'webp'].includes(ext) ? ext : 'jpeg';
    await runIdentify(`data:image/${safeExt};base64,${asset.base64}`);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>📸 SNAP & IDENTIFY</Text>
          <Text style={styles.title}>What's that landmark?</Text>
          <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
        >
          {/* Pick phase */}
          {phase === 'pick' && (
            <>
              <Text style={styles.hint}>
                Point your camera at any NZ landmark, monument, or natural feature
                and Claude will identify it for you.
              </Text>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => pickImage('camera')}
                activeOpacity={0.85}
              >
                <Ionicons name="camera" size={26} color="white" />
                <Text style={styles.primaryBtnText}>Take a Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => pickImage('library')}
                activeOpacity={0.85}
              >
                <Ionicons name="images-outline" size={26} color={colors.primary} />
                <Text style={styles.secondaryBtnText}>Choose from Library</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Loading phase */}
          {phase === 'loading' && (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Claude is analysing your photo…</Text>
              <Text style={styles.loadingHint}>Usually takes 5–10 seconds</Text>
            </View>
          )}

          {/* Error phase */}
          {phase === 'error' && (
            <View style={styles.center}>
              <Ionicons name="warning-outline" size={44} color={colors.danger} />
              <Text style={styles.errorText}>{errorMsg}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={reset}>
                <Ionicons name="refresh" size={16} color={colors.primary} />
                <Text style={styles.retryBtnText}>Try again</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Result phase */}
          {phase === 'result' && result && (
            <View style={styles.result}>
              <View style={styles.resultNameRow}>
                <Text style={styles.resultName}>{result.name}</Text>
                <View style={[
                  styles.confidenceBadge,
                  { backgroundColor: CONFIDENCE_COLORS[result.confidence] || '#888' },
                ]}>
                  <Text style={styles.confidenceText}>
                    {result.confidence} confidence
                  </Text>
                </View>
              </View>

              {!!result.location && (
                <View style={styles.locationRow}>
                  <Ionicons name="location" size={14} color={colors.muted} />
                  <Text style={styles.locationText}>{result.location}</Text>
                </View>
              )}

              {!!result.description && (
                <Text style={styles.description}>{result.description}</Text>
              )}

              {result.tips?.length > 0 && (
                <View style={styles.tipsBox}>
                  <Text style={styles.tipsLabel}>VISITOR TIPS</Text>
                  {result.tips.map((tip, i) => (
                    <Text key={i} style={styles.tip}>• {tip}</Text>
                  ))}
                </View>
              )}

              {result.alternatives?.length > 0 && (
                <Text style={styles.alternatives}>
                  Could also be: {result.alternatives.join(', ')}
                </Text>
              )}

              <Text style={styles.poweredBy}>Identified by Claude · Anthropic</Text>

              <TouchableOpacity style={styles.retryBtn} onPress={reset}>
                <Ionicons name="camera-outline" size={16} color={colors.primary} />
                <Text style={styles.retryBtnText}>Identify another</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingRight: 56,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: colors.primary,
    marginBottom: 4,
  },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  closeBtn: { position: 'absolute', top: spacing.md, right: spacing.md, padding: 6 },
  body: { padding: spacing.lg, gap: spacing.md, flexGrow: 1 },
  hint: {
    fontSize: 15,
    color: colors.muted,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: colors.primary,
    paddingVertical: 18,
    borderRadius: radius.md,
  },
  primaryBtnText: { color: 'white', fontWeight: '700', fontSize: 17 },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: 18,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: 'transparent',
  },
  secondaryBtnText: { color: colors.primary, fontWeight: '700', fontSize: 17 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
    minHeight: 260,
  },
  loadingText: { fontSize: 16, color: colors.muted, textAlign: 'center', marginTop: spacing.md },
  loadingHint: { fontSize: 13, color: colors.border, textAlign: 'center' },
  errorText: { fontSize: 15, color: colors.danger, textAlign: 'center', lineHeight: 22 },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primary,
    marginTop: spacing.sm,
    alignSelf: 'center',
  },
  retryBtnText: { color: colors.primary, fontWeight: '700' },
  result: { gap: spacing.lg },
  resultNameRow: { gap: spacing.sm },
  resultName: { fontSize: 24, fontWeight: '700', color: colors.text },
  confidenceBadge: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  confidenceText: { color: 'white', fontSize: 12, fontWeight: '700' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { fontSize: 14, color: colors.muted },
  description: { fontSize: 15, lineHeight: 24, color: colors.text },
  tipsBox: {
    backgroundColor: '#FAF7F0',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  tipsLabel: { fontSize: 10, fontWeight: '700', color: colors.muted, letterSpacing: 1.2 },
  tip: { fontSize: 14, lineHeight: 21, color: colors.text },
  alternatives: { fontSize: 13, color: colors.muted, fontStyle: 'italic' },
  poweredBy: { fontSize: 12, color: colors.border, textAlign: 'center', marginTop: spacing.sm },
});
