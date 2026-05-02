import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { colors } from '../theme';

const { width: SCREEN_W } = Dimensions.get('window');

// The Q speech-bubble logo mark
const Q_LOGO = require('../../assets/logo-mark.png');

/* ── Themed loading messages that cycle on-screen ── */
const MESSAGES = [
  'Mapping the trails…',
  'Discovering hidden gems…',
  'Loading attractions…',
  'Charting the coastline…',
  'Preparing your adventure…',
  'Gathering local stories…',
  'Tuning the audio guide…',
  'Almost there…',
];

const MESSAGE_INTERVAL = 2400; // ms between message swaps

/* ── Pulsing Q logo ── */
function PulsingLogo({ pulse }) {
  const size = 120;

  return (
    <View style={styles.logoWrap}>
      {/* Soft glow ring that expands/contracts with the pulse */}
      <Animated.View
        style={[
          styles.glowRing,
          {
            width: size + 30,
            height: size + 30,
            borderRadius: (size + 30) / 2,
            opacity: pulse.interpolate({
              inputRange: [0.92, 1, 1.1],
              outputRange: [0.5, 0.2, 0.5],
              extrapolate: 'clamp',
            }),
            transform: [{ scale: pulse }],
          },
        ]}
      />

      {/* The Q logo — pulses gently in and out */}
      <Animated.Image
        source={Q_LOGO}
        style={[
          styles.logoImage,
          {
            width: size,
            height: size,
            transform: [{ scale: pulse }],
          },
        ]}
        resizeMode="contain"
      />
    </View>
  );
}

/* ── Floating particle dots ── */
function FloatingDots({ anims }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {anims.map((a, i) => (
        <Animated.View
          key={i}
          style={[
            styles.dot,
            {
              left: a.x,
              opacity: a.opacity,
              transform: [{ translateY: a.y }],
            },
          ]}
        />
      ))}
    </View>
  );
}

/* ── Progress bar ── */
function ProgressBar({ progress }) {
  return (
    <View style={styles.progressTrack}>
      <Animated.View
        style={[
          styles.progressFill,
          {
            width: progress.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%'],
            }),
          },
        ]}
      />
    </View>
  );
}

/* ═══════════════════════════════════════════════════
   Main LoadingScreen
   ═══════════════════════════════════════════════════ */
export default function LoadingScreen({ onFinished, dataReady }) {
  /* ── Animated values ── */
  const pulse = useRef(new Animated.Value(1)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const fadeOut = useRef(new Animated.Value(1)).current;
  const msgFade = useRef(new Animated.Value(1)).current;

  const [msgIndex, setMsgIndex] = useState(0);

  /* Floating dots setup */
  const dotCount = 8;
  const dotAnims = useRef(
    Array.from({ length: dotCount }, () => ({
      opacity: new Animated.Value(0),
      y: new Animated.Value(0),
      x: Math.random() * (SCREEN_W - 20) + 10,
    })),
  ).current;

  /* ── Kick off animations on mount ── */
  useEffect(() => {
    // Fade in the whole screen
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Breathing pulse — logo scales gently in and out
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.1,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.92,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // Floating dots
    dotAnims.forEach((d, i) => {
      const delay = i * 400;
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(d.opacity, { toValue: 0.6, duration: 800, useNativeDriver: true }),
            Animated.timing(d.y, { toValue: -80, duration: 2400, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(d.opacity, { toValue: 0, duration: 600, useNativeDriver: true }),
            Animated.timing(d.y, { toValue: -120, duration: 600, useNativeDriver: true }),
          ]),
          Animated.timing(d.y, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      ).start();
    });

    // Simulated progress (reaches ~85% quickly, waits for data)
    Animated.timing(progress, {
      toValue: 0.85,
      duration: 3000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, []);

  /* ── Cycle messages ── */
  useEffect(() => {
    const interval = setInterval(() => {
      // Fade out, swap text, fade in
      Animated.timing(msgFade, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        setMsgIndex((prev) => (prev + 1) % MESSAGES.length);
        Animated.timing(msgFade, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }).start();
      });
    }, MESSAGE_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  /* ── When data is ready, finish progress bar and transition out ── */
  useEffect(() => {
    if (!dataReady) return;

    // Complete progress bar
    Animated.timing(progress, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();

    // Slight pause, then fade out
    const timeout = setTimeout(() => {
      Animated.timing(fadeOut, {
        toValue: 0,
        duration: 400,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        onFinished?.();
      });
    }, 700);

    return () => clearTimeout(timeout);
  }, [dataReady]);

  return (
    <Animated.View style={[styles.container, { opacity: Animated.multiply(fadeIn, fadeOut) }]}>
      <FloatingDots anims={dotAnims} />

      <View style={styles.content}>
        {/* Pulsing Q logo */}
        <PulsingLogo pulse={pulse} />

        {/* Brand name */}
        <Text style={styles.brand}>QIWIOSITY</Text>

        {/* Cycling message */}
        <Animated.Text style={[styles.message, { opacity: msgFade }]}>
          {MESSAGES[msgIndex]}
        </Animated.Text>

        {/* Progress bar */}
        <ProgressBar progress={progress} />
      </View>

      <Text style={styles.footer}>Aotearoa Awaits</Text>
    </Animated.View>
  );
}

/* ═══════════════════════════════════════════════════
   Styles
   ═══════════════════════════════════════════════════ */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primaryDeep,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },

  /* Spinning logo */
  logoWrap: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  glowRing: {
    position: 'absolute',
    backgroundColor: 'rgba(21, 136, 138, 0.3)',
  },
  logoImage: {
    borderRadius: 24,
  },

  /* Floating dots */
  dot: {
    position: 'absolute',
    bottom: 120,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },

  /* Text */
  brand: {
    color: 'white',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 6,
    marginBottom: 12,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  message: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 28,
    height: 22,
    textAlign: 'center',
  },

  /* Progress */
  progressTrack: {
    width: 200,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 1.5,
    backgroundColor: colors.accent,
  },

  /* Footer */
  footer: {
    position: 'absolute',
    bottom: 50,
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
});
