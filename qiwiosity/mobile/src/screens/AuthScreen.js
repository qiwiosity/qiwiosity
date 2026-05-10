import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius, type } from '../theme';

function showAlert(title, message, onOk) {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
    if (onOk) onOk();
  } else {
    const buttons = onOk ? [{ text: 'OK', onPress: onOk }] : undefined;
    Alert.alert(title, message, buttons);
  }
}

export default function AuthScreen({ navigation }) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [handle, setHandle] = useState('');
  const [busy, setBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const submit = async () => {
    setStatusMsg('');
    if (!email.trim() || !password.trim()) {
      showAlert('Missing fields', 'Email and password are required.');
      return;
    }
    if (mode === 'signup' && !handle.trim()) {
      showAlert('Missing fields', 'A display name is required.');
      return;
    }
    if (mode === 'signup' && handle.trim().length < 2) {
      showAlert('Display name too short', 'Must be at least 2 characters.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'signin') {
        await signIn(email.trim(), password);
        navigation.goBack();
      } else {
        await signUp(email.trim(), password, handle.trim());
        setStatusMsg('Check your email for a confirmation link, then sign in.');
        showAlert(
          'Check your email',
          'We sent you a confirmation link. Tap it to activate your account, then sign in here.',
          () => setMode('signin'),
        );
      }
    } catch (err) {
      const msg = err.message || 'Something went wrong. Please try again.';
      setStatusMsg(msg);
      showAlert('Error', msg);
    } finally {
      setBusy(false);
    }
  };

  const toggleMode = () => {
    setMode(m => m === 'signin' ? 'signup' : 'signin');
    setEmail('');
    setPassword('');
    setHandle('');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.inner}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <Ionicons name="person-circle" size={72} color={colors.primary} />
          <Text style={styles.title}>
            {mode === 'signin' ? 'Welcome back' : 'Create account'}
          </Text>
          <Text style={styles.subtitle}>
            {mode === 'signin'
              ? 'Sign in to sync your wishlist and join the community.'
              : 'Join to save favourites, vote on tips, and contribute.'}
          </Text>
        </View>

        <View style={styles.form}>
          {mode === 'signup' && (
            <Field
              label="Display name"
              placeholder="e.g. KiwiExplorer"
              value={handle}
              onChangeText={setHandle}
              autoCapitalize="words"
              maxLength={20}
            />
          )}
          <Field
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Field
            label="Password"
            placeholder={mode === 'signup' ? 'At least 8 characters' : ''}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.submit, busy && { opacity: 0.7 }]}
            onPress={submit}
            disabled={busy}
          >
            {busy
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.submitText}>
                  {mode === 'signin' ? 'Sign in' : 'Create account'}
                </Text>}
          </TouchableOpacity>

          {statusMsg ? (
            <Text style={styles.statusMsg}>{statusMsg}</Text>
          ) : null}
        </View>

        <TouchableOpacity style={styles.toggle} onPress={toggleMode} disabled={busy}>
          <Text style={styles.toggleText}>
            {mode === 'signin'
              ? "Don't have an account? Sign up"
              : 'Already have an account? Sign in'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, ...props }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        placeholderTextColor={colors.muted}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  inner: { flexGrow: 1, padding: spacing.xl, justifyContent: 'center', gap: spacing.xl },
  hero: { alignItems: 'center', gap: spacing.sm },
  title: { ...type.title, textAlign: 'center' },
  subtitle: { ...type.body, color: colors.muted, textAlign: 'center' },
  form: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  fieldWrap: { gap: spacing.xs },
  fieldLabel: {
    ...type.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.bg,
  },
  submit: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  statusMsg: {
    textAlign: 'center',
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
    marginTop: spacing.sm,
    lineHeight: 18,
  },
  toggle: { alignItems: 'center' },
  toggleText: { color: colors.primary, fontWeight: '600', fontSize: 14 },
});
