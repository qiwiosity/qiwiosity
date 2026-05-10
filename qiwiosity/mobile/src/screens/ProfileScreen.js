import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Alert, ActivityIndicator, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius, type } from '../theme';

function showConfirm(title, message, onConfirm) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
  } else {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: onConfirm },
    ]);
  }
}

export default function ProfileScreen({ navigation }) {
  const { user, profile, isAuthenticated, signOut, updateProfile, refreshProfile } = useAuth();
  const [editingHandle, setEditingHandle] = useState(false);
  const [handle, setHandle] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile?.handle) setHandle(profile.handle);
  }, [profile?.handle]);

  if (!isAuthenticated) {
    return (
      <View style={styles.unauthContainer}>
        <Ionicons name="person-circle-outline" size={80} color={colors.muted} />
        <Text style={styles.unauthTitle}>Sign in to your account</Text>
        <Text style={styles.unauthBody}>
          Sync your wishlist, vote on community tips, and contribute to Qiwiosity.
        </Text>
        <TouchableOpacity
          style={styles.signInBtn}
          onPress={() => navigation.navigate('Auth')}
        >
          <Text style={styles.signInBtnText}>Sign in / Create account</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const saveHandle = async () => {
    const trimmed = handle.trim();
    if (!trimmed || trimmed === profile?.handle) {
      setHandle(profile?.handle || '');
      setEditingHandle(false);
      return;
    }
    setSaving(true);
    try {
      await updateProfile({ handle: trimmed });
      setEditingHandle(false);
    } catch (err) {
      const msg = err.message || 'Could not update display name.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Error', msg);
      setHandle(profile?.handle || '');
      setEditingHandle(false);
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setHandle(profile?.handle || '');
    setEditingHandle(false);
  };

  const confirmSignOut = () => {
    showConfirm('Sign out', 'Are you sure you want to sign out?', signOut);
  };

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-NZ', {
        year: 'numeric', month: 'long',
      })
    : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Avatar + handle */}
      <View style={styles.hero}>
        <Ionicons name="person-circle" size={88} color={colors.primary} />

        {editingHandle ? (
          <View style={styles.editRow}>
            <TextInput
              style={styles.handleInput}
              value={handle}
              onChangeText={setHandle}
              autoFocus
              autoCapitalize="words"
              maxLength={20}
              returnKeyType="done"
              onSubmitEditing={saveHandle}
            />
            {saving
              ? <ActivityIndicator color={colors.primary} style={{ marginLeft: spacing.sm }} />
              : <>
                  <TouchableOpacity onPress={saveHandle} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="checkmark-circle" size={30} color={colors.success} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={cancelEdit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close-circle" size={30} color={colors.muted} />
                  </TouchableOpacity>
                </>}
          </View>
        ) : (
          <TouchableOpacity
            style={styles.handleRow}
            onPress={() => { setHandle(profile?.handle || ''); setEditingHandle(true); }}
          >
            <Text style={styles.handleText}>{profile?.handle || 'Anonymous'}</Text>
            <Ionicons name="pencil-outline" size={16} color={colors.muted} />
          </TouchableOpacity>
        )}

        <Text style={type.caption}>{user?.email}</Text>
      </View>

      {/* Reload prompt when profile is local-only */}
      {profile?._local && (
        <View style={{ alignItems: 'center', marginBottom: spacing.md, gap: spacing.xs }}>
          <Text style={[type.caption, { color: colors.danger }]}>
            Profile not saved to database yet
          </Text>
          <TouchableOpacity
            style={[styles.signInBtn, { alignSelf: 'center' }]}
            onPress={refreshProfile}
          >
            <Text style={styles.signInBtnText}>Retry save</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Account info */}
      <Section title="Account">
        <InfoRow icon="mail-outline" label="Email" value={user?.email} />
        {memberSince && (
          <InfoRow icon="calendar-outline" label="Member since" value={memberSince} />
        )}
      </Section>

      {/* Sign out */}
      <TouchableOpacity style={styles.signOutBtn} onPress={confirmSignOut}>
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={20} color={colors.primary} style={{ width: 26 }} />
      <Text style={[type.body, { flex: 1 }]}>{label}</Text>
      <Text style={[type.caption, { flexShrink: 1, textAlign: 'right' }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: spacing.xxl },

  unauthContainer: {
    flex: 1, backgroundColor: colors.bg,
    alignItems: 'center', justifyContent: 'center',
    padding: spacing.xl, gap: spacing.md,
  },
  unauthTitle: { ...type.heading, textAlign: 'center', marginTop: spacing.sm },
  unauthBody: { ...type.caption, textAlign: 'center', lineHeight: 20 },
  signInBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  signInBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  hero: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  handleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  handleText: { fontSize: 22, fontWeight: '700', color: colors.text },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  handleInput: {
    fontSize: 20, fontWeight: '700', color: colors.text,
    borderBottomWidth: 2, borderBottomColor: colors.primary,
    minWidth: 120, textAlign: 'center', paddingBottom: 2,
  },

  section: { marginTop: spacing.lg },
  sectionTitle: {
    paddingHorizontal: spacing.md, paddingBottom: spacing.xs,
    ...type.caption, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5,
  },
  sectionBody: {
    marginHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },

  signOutBtn: {
    margin: spacing.lg, marginTop: spacing.xl,
    padding: spacing.md, borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.danger,
    alignItems: 'center',
  },
  signOutText: { color: colors.danger, fontWeight: '700' },
});
