import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert, Animated,
  AppState,
  KeyboardAvoidingView,
  Modal, Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text, TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../../lib/supabase';
import tokens from '../../lib/tokens';

const t = tokens.semantic.dark;
const { spacing, radius, fontSize, fontWeight, motion, component } = tokens;

const TAGS = ['Sick', 'Travel', 'Visitors', 'Night out'];

type Child = { id: string; name: string; birth_date: string | null };

export default function TonightScreen() {
  const [lightsOffTime, setLightsOffTime] = useState<Date | null>(null);
  const [asleepTime, setAsleepTime] = useState<Date | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [children, setChildren] = useState<Child[]>([]);
  const [activeChild, setActiveChild] = useState<Child | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [switcherVisible, setSwitcherVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(600)).current;
  const switcherAnim = useRef(new Animated.Value(600)).current;
  const timerRef = useRef<any>(null);

  useFocusEffect(useCallback(() => {
    loadChildren();
    return () => {};
  }, []));

  useEffect(() => {
    if (lightsOffTime && !asleepTime) {
      const update = () => {
        setElapsed(Math.floor((Date.now() - lightsOffTime.getTime()) / 1000));
      };
      update();
      timerRef.current = setInterval(update, 1000);
      const sub = AppState.addEventListener('change', state => {
        if (state === 'active') update();
      });
      return () => { clearInterval(timerRef.current); sub.remove(); };
    } else {
      clearInterval(timerRef.current);
    }
  }, [lightsOffTime, asleepTime]);

  const loadChildren = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('children').select('*').eq('user_id', user.id).order('created_at');
    if (data && data.length > 0) {
      setChildren(data);
      setActiveChild(prev => prev ? (data.find(c => c.id === prev.id) || data[0]) : data[0]);
    } else {
      const { data: newChild } = await supabase
        .from('children')
        .insert({ user_id: user.id, name: 'My Child' })
        .select().single();
      if (newChild) { setChildren([newChild]); setActiveChild(newChild); }
    }
  };

  const formatTime = (date: Date) =>
    date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const getLatency = () => {
    if (!lightsOffTime || !asleepTime) return null;
    return Math.round((asleepTime.getTime() - lightsOffTime.getTime()) / 60000);
  };

  const toggleTag = (tag: string) =>
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);

  const openSheet = () => {
    setSheetVisible(true);
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start();
  };

  const closeSheet = () => {
    Animated.timing(slideAnim, { toValue: 600, duration: motion.duration.normal, useNativeDriver: true })
      .start(() => setSheetVisible(false));
  };

  const openSwitcher = () => {
    setSwitcherVisible(true);
    Animated.spring(switcherAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start();
  };

  const closeSwitcher = () => {
    Animated.timing(switcherAnim, { toValue: 600, duration: motion.duration.normal, useNativeDriver: true })
      .start(() => setSwitcherVisible(false));
  };

  const handleAsleepPress = () => {
    if (!lightsOffTime || asleepTime) return;
    setAsleepTime(new Date());
    setTimeout(() => openSheet(), 100);
  };

  const saveEntry = async () => {
    if (!lightsOffTime || !asleepTime || !activeChild) return;
    setSaving(true);
    const today = new Date().toLocaleDateString('en-CA');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('bedtime_entries').upsert({
      user_id: user.id, child_id: activeChild.id, date: today,
      lights_off_time: lightsOffTime.toISOString(),
      asleep_time: asleepTime.toISOString(),
      tags: selectedTags,
    }, { onConflict: 'child_id,date' });
    if (error) Alert.alert('Error', error.message);
    else { setSaved(true); closeSheet(); }
    setSaving(false);
  };

  const reset = () => {
    setLightsOffTime(null);
    setAsleepTime(null);
    setSelectedTags([]);
    setSaved(false);
    setElapsed(0);
    closeSheet();
  };

  const latency = getLatency();
  const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const secs = String(elapsed % 60).padStart(2, '0');
  const today = new Date().toLocaleDateString([], { day: 'numeric', month: 'long', weekday: 'long' });
  const headerFaded = !!lightsOffTime && !saved;
  const isOptimal = latency !== null && latency <= 20;

  return (
    <SafeAreaView style={s.container}>
      <View style={s.inner}>

        {/* Header */}
        <View style={s.headerRow}>
          <View>
            <Text style={[s.heading, headerFaded && s.textFaded]}>Tonight</Text>
            <Text style={[s.date, headerFaded && s.textMoreFaded]}>{today}</Text>
          </View>
          {children.length > 1 && activeChild && (
            <TouchableOpacity style={s.childPill} onPress={openSwitcher} activeOpacity={0.7}>
              <Text style={s.childPillText}>{activeChild.name}</Text>
              <Text style={s.childPillChevron}>›</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Timer */}
        <View style={s.timerArea}>
          {lightsOffTime && !asleepTime ? (
            <View style={s.timerRow}>
              <Text style={s.timerMins}>{mins}</Text>
              <Text style={s.timerColon}>:</Text>
              <Text style={s.timerSecs}>{secs}</Text>
            </View>
          ) : (
            <Text style={s.timerIdle}>00<Text style={s.timerIdleColon}>:</Text>00</Text>
          )}
        </View>

        {/* Buttons */}
        <View style={s.buttonGroup}>
          <TouchableOpacity
            style={[s.actionBtn, lightsOffTime ? s.actionBtnDisabled : s.actionBtnActive]}
            onPress={() => !lightsOffTime && setLightsOffTime(new Date())}
            activeOpacity={0.7}
            disabled={!!lightsOffTime}
          >
            <View style={[s.iconCircle, lightsOffTime ? s.iconCircleDisabled : s.iconCircleActive]}>
              <Text style={[s.iconText, lightsOffTime && { color: t.textMuted }]}>
                {lightsOffTime ? '✓' : '–'}
              </Text>
            </View>
            {lightsOffTime && (
              <View style={s.timeBadge}>
                <Text style={s.timeBadgeText}>{formatTime(lightsOffTime)}</Text>
              </View>
            )}
            <Text style={[s.btnLabel, lightsOffTime && { color: t.textMuted }]}>Lights off</Text>
            <Text style={[s.btnSub, lightsOffTime && { color: t.textMuted }]}>bed time</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              s.actionBtn,
              !lightsOffTime ? s.actionBtnDisabled : asleepTime ? s.actionBtnDisabled : s.actionBtnActive,
            ]}
            onPress={handleAsleepPress}
            activeOpacity={0.7}
            disabled={!lightsOffTime || !!asleepTime}
          >
            <View style={[
              s.iconCircle,
              !lightsOffTime || asleepTime ? s.iconCircleDisabled : s.iconCircleActive,
            ]}>
              <Text style={[s.iconText, (!lightsOffTime || asleepTime) && { color: t.textMuted }]}>
                {asleepTime ? '✓' : '○'}
              </Text>
            </View>
            {asleepTime && (
              <View style={s.timeBadge}>
                <Text style={s.timeBadgeText}>{formatTime(asleepTime)}</Text>
              </View>
            )}
            <Text style={[s.btnLabel, (!lightsOffTime || asleepTime) && { color: t.textMuted }]}>
              Asleep
            </Text>
            <Text style={[s.btnSub, (!lightsOffTime || asleepTime) && { color: t.textMuted }]}>
              I left the room
            </Text>
          </TouchableOpacity>
        </View>

        {saved && (
          <View style={s.savedRow}>
            <View style={s.savedBadge}>
              <Text style={s.savedText}>✓ Saved</Text>
            </View>
            <TouchableOpacity onPress={reset}>
              <Text style={s.resetText}>Reset</Text>
            </TouchableOpacity>
          </View>
        )}

        {asleepTime && !sheetVisible && !saved && (
          <TouchableOpacity style={s.viewEntryBtn} onPress={openSheet}>
            <Text style={s.viewEntryText}>View entry</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Entry Bottom Sheet */}
      <Modal visible={sheetVisible} transparent animationType="none" onRequestClose={closeSheet}>
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={closeSheet} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}
        >
          <Animated.View style={[s.sheet, { transform: [{ translateY: slideAnim }] }]}>
            <View style={s.sheetHandle} />

            {latency !== null && (
              <View style={s.resultRow}>
                <Text style={s.resultNum}>{latency}</Text>
                <Text style={s.resultUnit}> min to fall asleep</Text>
              </View>
            )}
            {isOptimal && (
              <View style={s.optimalBadge}>
                <Text style={s.optimalText}>Optimal time — well done</Text>
              </View>
            )}

            {/* Swapped: Asleep first, then Lights off */}
            <View style={s.timeRows}>
              {asleepTime && (
                <View style={s.timeRow}>
                  <Text style={s.timeRowLabel}>Asleep</Text>
                  <Text style={s.timeRowValue}>{formatTime(asleepTime)}</Text>
                </View>
              )}
              {lightsOffTime && (
                <View style={[s.timeRow, { borderBottomWidth: 0 }]}>
                  <Text style={s.timeRowLabel}>Lights off</Text>
                  <Text style={s.timeRowValue}>{formatTime(lightsOffTime)}</Text>
                </View>
              )}
            </View>

            <Text style={s.tagsLabel}>Events</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: spacing[8] }}
            >
              <View style={s.tagRow}>
                {TAGS.map(tag => (
                  <TouchableOpacity
                    key={tag}
                    style={[s.tag, selectedTags.includes(tag) && s.tagActive]}
                    onPress={() => toggleTag(tag)}
                  >
                    {selectedTags.includes(tag) && <Text style={s.tagCheck}>✓ </Text>}
                    <Text style={[s.tagText, selectedTags.includes(tag) && s.tagTextActive]}>{tag}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <TouchableOpacity style={s.saveBtn} onPress={saveEntry} disabled={saving}>
              <Text style={s.saveBtnText}>{saving ? 'Saving...' : 'Save'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.resetSheetBtn} onPress={reset}>
              <Text style={s.resetSheetText}>Reset</Text>
            </TouchableOpacity>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Child Switcher */}
      <Modal visible={switcherVisible} transparent animationType="none" onRequestClose={closeSwitcher}>
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={closeSwitcher} />
        <Animated.View style={[s.sheet, {
          position: 'absolute', bottom: 0, left: 0, right: 0,
          transform: [{ translateY: switcherAnim }],
        }]}>
          <View style={s.sheetHandle} />
          <Text style={s.switcherTitle}>Switch child</Text>
          <View style={s.switcherList}>
            {children.map(child => {
              const isActive = child.id === activeChild?.id;
              return (
                <TouchableOpacity
                  key={child.id}
                  style={[s.switcherRow, isActive && s.switcherRowActive]}
                  onPress={() => { setActiveChild(child); closeSwitcher(); }}
                  activeOpacity={0.7}
                >
                  <Text style={[s.switcherName, isActive && s.switcherNameActive]}>
                    {child.name}
                  </Text>
                  {isActive && <Text style={s.switcherCheck}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  inner: { flex: 1, paddingHorizontal: spacing[6], paddingTop: spacing[5], paddingBottom: spacing[3] },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heading: { fontSize: fontSize['4xl'], fontWeight: String(fontWeight.bold) as any, color: t.textPrimary, letterSpacing: -0.5 },
  date: { fontSize: fontSize.base, color: t.textSecondary, marginTop: spacing[1] },
  textFaded: { color: 'rgba(255,255,255,0.2)' },
  textMoreFaded: { color: 'rgba(255,255,255,0.1)' },

  childPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: t.bgCard, borderRadius: radius.full,
    paddingHorizontal: spacing[4], paddingVertical: spacing[2],
    borderWidth: 1, borderColor: t.border, marginTop: spacing[1],
  },
  childPillText: { fontSize: fontSize.base, color: t.textPrimary, fontWeight: String(fontWeight.medium) as any },
  childPillChevron: { fontSize: fontSize.lg, color: t.textSecondary, lineHeight: 20 },

  timerArea: { flex: 1, justifyContent: 'center', alignItems: 'flex-start' },
  timerRow: { flexDirection: 'row', alignItems: 'baseline' },
  timerMins: { fontSize: 72, fontWeight: String(fontWeight.bold) as any, color: t.textPrimary, letterSpacing: -4 },
  timerColon: { fontSize: 52, fontWeight: String(fontWeight.light) as any, color: t.textSecondary, marginHorizontal: spacing[1], marginBottom: spacing[1] },
  timerSecs: { fontSize: fontSize['3xl'], fontWeight: String(fontWeight.light) as any, color: t.textSecondary },
  timerIdle: { fontSize: 72, fontWeight: String(fontWeight.bold) as any, color: 'rgba(255,255,255,0.1)', letterSpacing: -4 },
  timerIdleColon: { color: 'rgba(255,255,255,0.06)' },

  buttonGroup: { flexDirection: 'row', gap: spacing[3], marginBottom: spacing[4] },
  actionBtn: { flex: 1, borderRadius: radius['2xl'], padding: spacing[4], borderWidth: 1, minHeight: 130 },
  actionBtnActive: { backgroundColor: t.bgCard, borderColor: t.border },
  actionBtnDisabled: { backgroundColor: t.bgShell, borderColor: t.divider, opacity: 0.5 },

  iconCircle: { width: 32, height: 32, borderRadius: radius.full, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginBottom: spacing[6] },
  iconCircleActive: { borderColor: t.textPrimary },
  iconCircleDisabled: { borderColor: t.textMuted },
  iconText: { fontSize: fontSize.base, color: t.textPrimary, fontWeight: String(fontWeight.semibold) as any },

  timeBadge: { position: 'absolute', top: spacing[3], right: spacing[3], backgroundColor: tokens.color.success[500], borderRadius: radius.sm, paddingHorizontal: spacing[2], paddingVertical: 3 },
  timeBadgeText: { fontSize: fontSize.xs, fontWeight: String(fontWeight.semibold) as any, color: tokens.color.black },

  btnLabel: { fontSize: fontSize.lg, fontWeight: String(fontWeight.semibold) as any, color: t.textPrimary },
  btnSub: { fontSize: fontSize.sm, color: t.textSecondary, marginTop: spacing[1] },

  savedRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[2] },
  savedBadge: { backgroundColor: 'rgba(58,192,160,0.15)', borderRadius: radius.md, paddingHorizontal: spacing[4], paddingVertical: spacing[2] },
  savedText: { color: tokens.color.success[500], fontSize: fontSize.base, fontWeight: String(fontWeight.semibold) as any },
  resetText: { fontSize: fontSize.base, color: t.textSecondary },

  viewEntryBtn: { alignItems: 'center', paddingVertical: spacing[2] },
  viewEntryText: { fontSize: fontSize.base, color: t.textSecondary },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: { backgroundColor: t.bgShell, borderTopLeftRadius: radius['2xl'], borderTopRightRadius: radius['2xl'], padding: spacing[6], paddingBottom: spacing[12] },
  sheetHandle: { width: 36, height: 4, backgroundColor: t.border, borderRadius: radius.full, alignSelf: 'center', marginBottom: spacing[6] },

  resultRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: spacing[3] },
  resultNum: { fontSize: fontSize['6xl'], fontWeight: String(fontWeight.bold) as any, color: t.textPrimary, letterSpacing: -2 },
  resultUnit: { fontSize: fontSize.xl, color: t.textSecondary, marginLeft: spacing[1] },

  optimalBadge: { backgroundColor: tokens.color.success[500], borderRadius: radius.full, paddingHorizontal: spacing[4], paddingVertical: spacing[1], alignSelf: 'flex-start', marginBottom: spacing[5] },
  optimalText: { fontSize: fontSize.sm, fontWeight: String(fontWeight.semibold) as any, color: tokens.color.black },

  timeRows: { backgroundColor: t.bgCard, borderRadius: radius.lg, marginBottom: spacing[5] },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing[4], borderBottomWidth: 0.5, borderBottomColor: t.divider },
  timeRowLabel: { fontSize: fontSize.md, color: t.textSecondary },
  timeRowValue: { fontSize: fontSize.md, fontWeight: String(fontWeight.semibold) as any, color: t.textPrimary },

  tagsLabel: { fontSize: fontSize.sm, color: t.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing[2] },
  tagRow: { flexDirection: 'row', gap: spacing[2] },
  tag: { flexDirection: 'row', paddingHorizontal: spacing[4], paddingVertical: spacing[2], borderRadius: radius.full, borderWidth: 1, borderColor: t.border },
  tagActive: { backgroundColor: tokens.color.success[500], borderColor: tokens.color.success[500] },
  tagCheck: { fontSize: fontSize.sm, color: tokens.color.black, fontWeight: String(fontWeight.bold) as any },
  tagText: { fontSize: fontSize.base, color: t.textSecondary },
  tagTextActive: { color: tokens.color.black, fontWeight: String(fontWeight.semibold) as any },

  saveBtn: { backgroundColor: t.textPrimary, borderRadius: radius.md, height: component.button.heightLg, alignItems: 'center', justifyContent: 'center', marginBottom: spacing[2] },
  saveBtnText: { color: tokens.color.black, fontSize: fontSize.md, fontWeight: String(fontWeight.bold) as any },
  resetSheetBtn: { alignItems: 'center', padding: spacing[3] },
  resetSheetText: { fontSize: fontSize.md, color: t.textSecondary },

  switcherTitle: { fontSize: fontSize['2xl'], fontWeight: String(fontWeight.bold) as any, color: t.textPrimary, marginBottom: spacing[5] },
  switcherList: { gap: spacing[2] },
  switcherRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing[4], borderRadius: radius.lg, borderWidth: 1, borderColor: t.border, backgroundColor: t.bgCard },
  switcherRowActive: { borderColor: t.borderFocus },
  switcherName: { fontSize: fontSize.lg, color: t.textSecondary, fontWeight: String(fontWeight.medium) as any },
  switcherNameActive: { color: t.textPrimary, fontWeight: String(fontWeight.semibold) as any },
  switcherCheck: { fontSize: fontSize.lg, color: t.primary },
});