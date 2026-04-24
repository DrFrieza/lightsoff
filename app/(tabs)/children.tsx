import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    KeyboardAvoidingView,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { Path, Svg } from 'react-native-svg';
import { formatDateInput } from '../../lib/inputFormatters';
import { supabase } from '../../lib/supabase';
import tokens from '../../lib/tokens';

const t = tokens.semantic.dark;
const { spacing, radius, fontSize, fontWeight, component, motion } = tokens;

type Child = { id: string; name: string; birth_date: string | null };

const getAge = (birthDate: string | null) => {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  let years = today.getFullYear() - birth.getFullYear();
  let months = today.getMonth() - birth.getMonth();
  if (months < 0) { years--; months += 12; }
  if (years === 0) return `${months} months old`;
  if (months === 0) return `${years} year${years > 1 ? 's' : ''} old`;
  return `${years}y ${months}m old`;
};

const EditIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M19.2696 3.42666C18.7814 2.93851 17.99 2.93851 17.5018 3.42666L5.54283 15.3857L4.56563 19.4341L8.61402 18.4569L20.573 6.49786C21.0612 6.0097 21.0612 5.21824 20.573 4.73009L19.2696 3.42666ZM16.4412 2.366C17.5151 1.29206 19.2563 1.29206 20.3302 2.366L21.6337 3.66943C22.7076 4.74337 22.7076 6.48458 21.6337 7.55852L9.52546 19.6667C9.42788 19.7643 9.30526 19.8331 9.17111 19.8655L3.72458 21.1801C3.4706 21.2414 3.20302 21.1662 3.01827 20.9814C2.83352 20.7967 2.75823 20.5291 2.81954 20.2751L4.13422 14.8286C4.1666 14.6944 4.23537 14.5718 4.33295 14.4742L16.4412 2.366Z"
      fill={t.textMuted}
    />
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M15.4698 4.46925C15.7627 4.17635 16.2375 4.17635 16.5304 4.46925L19.5304 7.46925C19.8233 7.76214 19.8233 8.23701 19.5304 8.52991C19.2375 8.8228 18.7627 8.8228 18.4698 8.52991L15.4698 5.52991C15.1769 5.23701 15.1769 4.76214 15.4698 4.46925Z"
      fill={t.textMuted}
    />
  </Svg>
);

export default function ChildrenScreen() {
  const [children, setChildren] = useState<Child[]>([]);
  const [activeChildId, setActiveChildId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [editingChild, setEditingChild] = useState<Child | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [birthInput, setBirthInput] = useState('');
  const [saving, setSaving] = useState(false);
  const slideAnim = useRef(new Animated.Value(600)).current;

  useEffect(() => { initUser(); }, []);

  useFocusEffect(useCallback(() => {
    loadChildren();
    return () => {};
  }, []));

  const initUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
  };

  const loadChildren = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('children').select('*').eq('user_id', user.id).order('created_at');
    if (data) {
      setChildren(data);
      if (data.length > 0 && !activeChildId) setActiveChildId(data[0].id);
    }
  };

  const openSheet = (child?: Child) => {
    setEditingChild(child || null);
    setNameInput(child?.name || '');
    setBirthInput(child?.birth_date || '');
    setSheetVisible(true);
    Animated.spring(slideAnim, {
      toValue: 0, useNativeDriver: true, tension: 65, friction: 11,
    }).start();
  };

  const closeSheet = () => {
    Animated.timing(slideAnim, {
      toValue: 600, duration: motion.duration.normal, useNativeDriver: true,
    }).start(() => { setSheetVisible(false); setEditingChild(null); });
  };

  const saveChild = async () => {
    if (!nameInput.trim() || !userId) return;
    setSaving(true);
    if (editingChild) {
      const { error } = await supabase.from('children')
        .update({ name: nameInput.trim(), birth_date: birthInput || null })
        .eq('id', editingChild.id);
      if (error) Alert.alert('Error', error.message);
    } else {
      const { error } = await supabase.from('children')
        .insert({ user_id: userId, name: nameInput.trim(), birth_date: birthInput || null });
      if (error) Alert.alert('Error', error.message);
    }
    await loadChildren();
    closeSheet();
    setSaving(false);
  };

  const deleteChild = async () => {
    if (!editingChild) return;
    Alert.alert(
      'Remove child',
      `Remove ${editingChild.name}? All their bedtime data will be deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          await supabase.from('children').delete().eq('id', editingChild.id);
          if (activeChildId === editingChild.id) setActiveChildId(null);
          await loadChildren();
          closeSheet();
        }},
      ]
    );
  };

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.headerRow}>
          <Text style={s.heading}>Children</Text>
          <TouchableOpacity style={s.addBtn} onPress={() => openSheet()}>
            <Text style={s.addBtnText}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {children.length === 0 ? (
          <View style={s.emptyState}>
            <Text style={s.emptyIcon}>🌙</Text>
            <Text style={s.emptyTitle}>No children yet</Text>
            <Text style={s.emptySubtitle}>
              Add your first child to start tracking bedtime
            </Text>
            <TouchableOpacity style={s.emptyBtn} onPress={() => openSheet()}>
              <Text style={s.emptyBtnText}>Add child</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.childList}>
            {children.map(child => {
              const age = getAge(child.birth_date);
              const isActive = child.id === activeChildId;
              return (
                <TouchableOpacity
                  key={child.id}
                  style={[s.childRow, isActive && s.childRowActive]}
                  onPress={() => setActiveChildId(child.id)}
                  activeOpacity={0.7}
                >
                  <View style={[s.radio, isActive && s.radioActive]}>
                    {isActive && <View style={s.radioDot} />}
                  </View>
                  <View style={s.childInfo}>
                    <Text style={[s.childName, isActive && s.childNameActive]}>
                      {child.name}
                    </Text>
                    {age && <Text style={s.childAge}>{age}</Text>}
                  </View>
                  <TouchableOpacity
                    style={s.editBtn}
                    onPress={() => openSheet(child)}
                    activeOpacity={0.6}
                  >
                    <EditIcon />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      <Modal visible={sheetVisible} transparent animationType="none" onRequestClose={closeSheet}>
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={closeSheet} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}
        >
          <Animated.View style={[s.sheet, { transform: [{ translateY: slideAnim }] }]}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>
              {editingChild ? 'Edit child' : 'Add child'}
            </Text>

            <View style={s.fieldGroup}>
              <View style={s.fieldRow}>
                <Text style={s.fieldLabel}>Name</Text>
                <TextInput
                  style={s.fieldInput}
                  value={nameInput}
                  onChangeText={setNameInput}
                  placeholder="e.g. Emma"
                  placeholderTextColor={t.textMuted}
                  autoFocus
                />
              </View>
              <View style={[s.fieldRow, { borderBottomWidth: 0 }]}>
                <Text style={s.fieldLabel}>Date of birth</Text>
                <TextInput
                  style={s.fieldInput}
                  value={birthInput}
                  onChangeText={(v) => setBirthInput(formatDateInput(birthInput, v))}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={t.textMuted}
                  keyboardType="number-pad"
                  maxLength={10}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[s.saveBtn, !nameInput.trim() && { opacity: 0.4 }]}
              onPress={saveChild}
              disabled={saving || !nameInput.trim()}
            >
              <Text style={s.saveBtnText}>
                {saving ? 'Saving...' : editingChild ? 'Update' : 'Add child'}
              </Text>
            </TouchableOpacity>

            {editingChild && (
              <TouchableOpacity style={s.deleteBtn} onPress={deleteChild}>
                <Text style={s.deleteBtnText}>Delete {editingChild.name}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={s.cancelBtn} onPress={closeSheet}>
              <Text style={s.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  scroll: { padding: spacing[6], paddingTop: spacing[12], paddingBottom: spacing[14] },

  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: spacing[6],
  },
  heading: {
    fontSize: fontSize['4xl'],
    fontWeight: String(fontWeight.bold) as any,
    color: t.textPrimary,
  },
  addBtn: {
    backgroundColor: t.bgCard, borderRadius: radius.md,
    paddingHorizontal: spacing[4], paddingVertical: spacing[2],
    borderWidth: 1, borderColor: t.border,
  },
  addBtnText: {
    fontSize: fontSize.base,
    fontWeight: String(fontWeight.semibold) as any,
    color: t.textPrimary,
  },

  childList: { gap: spacing[3] },
  childRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing[5], paddingVertical: spacing[4],
    backgroundColor: t.bgShell, borderRadius: radius.lg,
    borderWidth: 1, borderColor: t.border, gap: spacing[4],
  },
  childRowActive: {
    backgroundColor: '#0A1929',
    borderColor: tokens.color.primaryDark,
  },
  radio: {
    width: 22, height: 22, borderRadius: radius.full,
    borderWidth: 2, borderColor: t.textMuted,
    alignItems: 'center', justifyContent: 'center',
  },
  radioActive: {
    borderColor: tokens.color.primaryDark,
    backgroundColor: tokens.color.primaryDark,
  },
  radioDot: {
    width: 8, height: 8, borderRadius: radius.full,
    backgroundColor: tokens.color.white,
  },
  childInfo: { flex: 1 },
  childName: {
    fontSize: fontSize.lg,
    fontWeight: String(fontWeight.semibold) as any,
    color: t.textSecondary,
  },
  childNameActive: { color: t.textPrimary },
  childAge: { fontSize: fontSize.sm, color: t.textMuted, marginTop: 2 },
  editBtn: { padding: spacing[2] },

  emptyState: { alignItems: 'center', paddingVertical: spacing[16] },
  emptyIcon: { fontSize: 48, marginBottom: spacing[4] },
  emptyTitle: {
    fontSize: fontSize['2xl'],
    fontWeight: String(fontWeight.bold) as any,
    color: t.textPrimary, marginBottom: spacing[2],
  },
  emptySubtitle: {
    fontSize: fontSize.base, color: t.textSecondary,
    textAlign: 'center', marginBottom: spacing[6],
    paddingHorizontal: spacing[6],
  },
  emptyBtn: {
    backgroundColor: t.textPrimary, borderRadius: radius.md,
    paddingHorizontal: spacing[6], paddingVertical: spacing[3],
  },
  emptyBtnText: {
    fontSize: fontSize.base,
    fontWeight: String(fontWeight.bold) as any,
    color: tokens.color.black,
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
    fontSize: fontSize.md,
    fontWeight: String(fontWeight.semibold) as any,
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
  deleteBtn: {
    borderRadius: radius.md, height: component.button.heightSm,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing[2], borderWidth: 1,
    borderColor: tokens.color.error[400],
  },
  deleteBtnText: {
    color: tokens.color.error[400], fontSize: fontSize.base,
    fontWeight: String(fontWeight.semibold) as any,
  },
  cancelBtn: { alignItems: 'center', padding: spacing[3] },
  cancelBtnText: { fontSize: fontSize.md, color: t.textSecondary },
});