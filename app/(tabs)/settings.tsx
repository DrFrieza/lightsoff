import { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    KeyboardAvoidingView,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { supabase } from '../../lib/supabase';
import tokens from '../../lib/tokens';

const t = tokens.semantic.dark;
const { spacing, radius, fontSize, fontWeight, component, motion } = tokens;

export default function SettingsScreen() {
  const [email, setEmail] = useState('');
  const [optimalMin, setOptimalMin] = useState('15');
  const [optimalMax, setOptimalMax] = useState('25');
  const [pwSheetVisible, setPwSheetVisible] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);
  const slideAnim = useRef(new Animated.Value(600)).current;

  useEffect(() => { loadUser(); }, []);

  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) setEmail(user.email);
  };

  const openPwSheet = () => {
    setNewPassword('');
    setConfirmPassword('');
    setPwSuccess(false);
    setPwSheetVisible(true);
    Animated.spring(slideAnim, {
      toValue: 0, useNativeDriver: true, tension: 65, friction: 11,
    }).start();
  };

  const closePwSheet = () => {
    Animated.timing(slideAnim, {
      toValue: 600, duration: motion.duration.normal, useNativeDriver: true,
    }).start(() => setPwSheetVisible(false));
  };

  const changePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    setPwSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) Alert.alert('Error', error.message);
    else {
      setPwSuccess(true);
      setTimeout(() => closePwSheet(), 1500);
    }
    setPwSaving(false);
  };

  const signOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: async () => {
        await supabase.auth.signOut();
      }},
    ]);
  };

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.heading}>Settings</Text>

        {/* Account */}
        <Text style={s.sectionLabel}>Account</Text>
        <View style={s.group}>
          <View style={s.row}>
            <Text style={s.rowLabel}>Email</Text>
            <Text style={s.rowValue} numberOfLines={1}>{email}</Text>
          </View>
          <TouchableOpacity style={[s.row, { borderBottomWidth: 0 }]} onPress={openPwSheet}>
            <Text style={s.rowLabel}>Change password</Text>
            <Text style={s.rowChevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* App */}
        <Text style={s.sectionLabel}>App</Text>
        <View style={s.group}>
          <View style={s.row}>
            <View style={s.rowLabelGroup}>
              <Text style={s.rowLabel}>Optimal range</Text>
              <Text style={s.rowSubLabel}>Minutes to fall asleep</Text>
            </View>
            <View style={s.rangeInputs}>
              <TextInput
                style={s.rangeInput}
                value={optimalMin}
                onChangeText={setOptimalMin}
                keyboardType="number-pad"
                maxLength={2}
              />
              <Text style={s.rangeDash}>–</Text>
              <TextInput
                style={s.rangeInput}
                value={optimalMax}
                onChangeText={setOptimalMax}
                keyboardType="number-pad"
                maxLength={2}
              />
              <Text style={s.rangeUnit}>min</Text>
            </View>
          </View>
          <View style={[s.row, { borderBottomWidth: 0, opacity: 0.4 }]}>
            <View style={s.rowLabelGroup}>
              <Text style={s.rowLabel}>Notifications</Text>
              <Text style={s.rowSubLabel}>Coming soon</Text>
            </View>
            <Switch value={false} disabled />
          </View>
        </View>

        {/* About */}
        <Text style={s.sectionLabel}>About</Text>
        <View style={s.group}>
          <View style={s.row}>
            <Text style={s.rowLabel}>Version</Text>
            <Text style={s.rowValue}>1.0.0</Text>
          </View>
          <View style={[s.row, { borderBottomWidth: 0 }]}>
            <Text style={[s.rowValue, { color: t.textMuted, fontSize: fontSize.sm }]}>
              Built for tired parents everywhere 🌙
            </Text>
          </View>
        </View>

        {/* Sign out */}
        <TouchableOpacity style={s.signOutBtn} onPress={signOut}>
          <Text style={s.signOutText}>Sign out</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Change Password Sheet */}
      <Modal visible={pwSheetVisible} transparent animationType="none" onRequestClose={closePwSheet}>
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={closePwSheet} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}
        >
          <Animated.View style={[s.sheet, { transform: [{ translateY: slideAnim }] }]}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>Change password</Text>

            {pwSuccess ? (
              <View style={s.successState}>
                <Text style={s.successIcon}>✓</Text>
                <Text style={s.successText}>Password updated!</Text>
              </View>
            ) : (
              <>
                <View style={s.fieldGroup}>
                  <View style={s.fieldRow}>
                    <Text style={s.fieldLabel}>New password</Text>
                    <TextInput
                      style={s.fieldInput}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      placeholder="Min 6 characters"
                      placeholderTextColor={t.textMuted}
                      secureTextEntry
                      autoFocus
                    />
                  </View>
                  <View style={[s.fieldRow, { borderBottomWidth: 0 }]}>
                    <Text style={s.fieldLabel}>Confirm</Text>
                    <TextInput
                      style={s.fieldInput}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="Repeat password"
                      placeholderTextColor={t.textMuted}
                      secureTextEntry
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[s.saveBtn, (!newPassword || !confirmPassword) && { opacity: 0.4 }]}
                  onPress={changePassword}
                  disabled={pwSaving || !newPassword || !confirmPassword}
                >
                  <Text style={s.saveBtnText}>
                    {pwSaving ? 'Updating...' : 'Update password'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={s.cancelBtn} onPress={closePwSheet}>
                  <Text style={s.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  scroll: { padding: spacing[6], paddingTop: spacing[12], paddingBottom: spacing[14] },
  heading: {
    fontSize: fontSize['4xl'],
    fontWeight: String(fontWeight.bold) as any,
    color: t.textPrimary, marginBottom: spacing[6],
  },

  sectionLabel: {
    fontSize: fontSize.sm, color: t.textMuted,
    textTransform: 'uppercase', letterSpacing: 1,
    marginBottom: spacing[2], marginLeft: spacing[1],
  },
  group: {
    backgroundColor: t.bgShell, borderRadius: radius.lg,
    borderWidth: 1, borderColor: t.border, marginBottom: spacing[6],
  },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing[5], paddingVertical: spacing[4],
    borderBottomWidth: 0.5, borderBottomColor: t.divider,
  },
  rowLabelGroup: { flex: 1 },
  rowLabel: { fontSize: fontSize.md, color: t.textPrimary },
  rowSubLabel: { fontSize: fontSize.sm, color: t.textMuted, marginTop: 2 },
  rowValue: { fontSize: fontSize.md, color: t.textSecondary, maxWidth: 200 },
  rowChevron: { fontSize: fontSize.xl, color: t.textMuted, lineHeight: 22 },

  rangeInputs: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  rangeInput: {
    backgroundColor: t.bgCard, borderRadius: radius.sm,
    paddingHorizontal: spacing[3], paddingVertical: spacing[1],
    fontSize: fontSize.md, fontWeight: String(fontWeight.semibold) as any,
    color: t.textPrimary, textAlign: 'center', width: 44,
    borderWidth: 1, borderColor: t.border,
  },
  rangeDash: { fontSize: fontSize.md, color: t.textMuted },
  rangeUnit: { fontSize: fontSize.sm, color: t.textMuted },

  signOutBtn: {
    borderRadius: radius.lg, paddingVertical: spacing[4],
    alignItems: 'center', borderWidth: 1,
    borderColor: 'rgba(255,97,109,0.3)',
    backgroundColor: 'rgba(255,97,109,0.08)',
  },
  signOutText: {
    fontSize: fontSize.md,
    fontWeight: String(fontWeight.semibold) as any,
    color: tokens.color.error[400],
  },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: t.bgShell,
    borderTopLeftRadius: radius['2xl'], borderTopRightRadius: radius['2xl'],
    padding: spacing[6], paddingBottom: spacing[12],
  },
  sheetHandle: {
    width: 36, height: 4, backgroundColor: t.border,
    borderRadius: radius.full, alignSelf: 'center', marginBottom: spacing[5],
  },
  sheetTitle: {
    fontSize: fontSize['2xl'],
    fontWeight: String(fontWeight.bold) as any,
    color: t.textPrimary, marginBottom: spacing[5],
  },

  fieldGroup: { backgroundColor: t.bgCard, borderRadius: radius.lg, marginBottom: spacing[5] },
  fieldRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: spacing[4], borderBottomWidth: 0.5, borderBottomColor: t.divider,
  },
  fieldLabel: { fontSize: fontSize.md, color: t.textSecondary },
  fieldInput: {
    fontSize: fontSize.md, fontWeight: String(fontWeight.semibold) as any,
    color: t.textPrimary, textAlign: 'right', flex: 1, marginLeft: spacing[4],
  },

  saveBtn: {
    backgroundColor: t.textPrimary, borderRadius: radius.md,
    height: component.button.heightLg,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing[3],
  },
  saveBtnText: {
    color: tokens.color.black, fontSize: fontSize.md,
    fontWeight: String(fontWeight.bold) as any,
  },
  cancelBtn: { alignItems: 'center', padding: spacing[3] },
  cancelBtnText: { fontSize: fontSize.md, color: t.textSecondary },

  successState: { alignItems: 'center', paddingVertical: spacing[8] },
  successIcon: { fontSize: 48, color: tokens.color.success[500], marginBottom: spacing[3] },
  successText: {
    fontSize: fontSize['2xl'],
    fontWeight: String(fontWeight.bold) as any,
    color: t.textPrimary,
  },
});