import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  Image,
  Animated,
  Easing,
  SafeAreaView,
} from 'react-native';
import { colors, radius, spacing } from '../theme';

// The brand landing-page illustration (logo + NZ landscape).
const SPLASH_BG = require('../../assets/splash-bg.png');

export default function SplashScreen({ onBegin }) {
  const fade = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(lift, {
        toValue: 0,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <ImageBackground source={SPLASH_BG} style={styles.bg} resizeMode="cover">
      {/* Soft gradient-like overlay so the button stays legible over the art. */}
      <View style={styles.overlay} />

      <SafeAreaView style={styles.safe}>
        <View style={{ flex: 1 }} />

        <Animated.View
          style={[
            styles.bottom,
            { opacity: fade, transform: [{ translateY: lift }] },
          ]}
        >
          <Text style={styles.tagline}>Explore New Zealand with Curiosity</Text>
          <Text style={styles.sub}>
            Curated places · Audio commentary · Trip planner · Driving directions
          </Text>

          <TouchableOpacity
            style={styles.button}
            onPress={onBegin}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>Begin Exploring</Text>
          </TouchableOpacity>

          <Text style={styles.footer}>AOTEAROA · AWAITS</Text>
        </Animated.View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: colors.primaryDeep,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 61, 61, 0.25)',
  },
  safe: { flex: 1, padding: spacing.xl },
  bottom: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    alignItems: 'center',
  },
  tagline: {
    color: 'white',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  sub: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowRadius: 4,
  },
  button: {
    marginTop: spacing.xl,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 52,
    borderRadius: radius.pill,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  footer: {
    marginTop: spacing.xl,
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    letterSpacing: 3,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowRadius: 4,
  },
});
