import { useEffect, useRef, useState } from 'react';
import {
  Alert, Animated,
  KeyboardAvoidingView,
  Modal, Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text, TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../../lib/supabase';

const TAGS = ['Sick', 'Travel', 'Visitors', 'Night out'];

const THEME = {
  bg: '#0c0c0e',
  surface: '#1c1c1e',
  surfaceHigh: '#2c2c2e',
  border: 'rgba(255,255,255,0.08)',
  borderActive: 'rgba(255,255,255,0.22)',
  textPrimary: '#ffffff',
  textSecondary: 'rgba(255,255,255,0.45)',
  textDisabled: 'rgba(255,255,255,0.15)',
  green: '#30d158',
  blue: '#0a84ff',
};

export default function TonightScreen() {
  const [lightsOffTime, setLightsOffTime] = useState<Date | null>(null);
  const [asleepTime, setAsleepTime] = useState<Date | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [childId, setChildId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [sheetVisible, setSheetVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(600)).current;
  const timerRef = useRef<any>(null);

  useEffect(() => { loadOrCreateChild(); }, []);

  useEffect(() => {
    if (lightsOffTime && !asleepTime) {
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - lightsOffTime.getTime()) / 1000));
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [lightsOffTime, asleepTime]);

  const loadOrCreateChild = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: children } = await supabase
      .from('children').select('*').eq('user_id', user.id).limit(1);
    if (children && children.length > 0) {
      setChildId(children[0].id);
    } else {
      const { data: newChild } = await supabase
        .from('children')
        .insert({ user_id: user.id, name: 'My Child' })
        .select().single();
      if (newChild) setChildId(newChild.id);
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
    Animated.timing(slideAnim, { toValue: 600, duration: 250, useNativeDriver: true }).start(() => {
      setSheetVisible(false);
    });
  };

  const handleAsleepPress = () => {
    if (!lightsOffTime || asleepTime) return;
    setAsleepTime(new Date());
    setTimeout(() => openSheet(), 100);
  };

  const saveEntry = async () => {
    if (!lightsOffTime || !asleepTime || !childId) return;
    setSaving(true);
    const today = new Date().toLocaleDateString('en-CA');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('bedtime_entries').upsert({
      user_id: user.id, child_id: childId, date: today,
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
  const isOptimal = latency !== null && latency <= 25;

  return (
    <SafeAreaView style={s.container}>
      <View style={s.inner}>

        {/* Header */}
        <View style={s.header}>
          <Text style={[s.heading, headerFaded && s.textFaded]}>Tonight</Text>
          <Text style={[s.date, headerFaded && s.textMoreFaded]}>{today}</Text>
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
          {/* Lights Off */}
          <TouchableOpacity
            style={[s.actionBtn, lightsOffTime ? s.actionBtnDone : s.actionBtnActive]}
            onPress={() => !lightsOffTime && setLightsOffTime(new Date())}
            activeOpacity={0.7}
            disabled={!!lightsOffTime}
          >
            <View style={[s.iconCircle, lightsOffTime ? s.iconCircleDone : s.iconCircleActive]}>
              <Text style={s.iconText}>{lightsOffTime ? '✓' : '–'}</Text>
            </View>
            {lightsOffTime && (
              <View style={s.timeBadge}>
                <Text style={s.timeBadgeText}>{formatTime(lightsOffTime)}</Text>
              </View>
            )}
            <Text style={[s.btnLabel, lightsOffTime && s.btnLabelDone]}>Lights off</Text>
            <Text style={[s.btnSub, lightsOffTime && s.btnSubDone]}>bed time</Text>
          </TouchableOpacity>

          {/* Asleep */}
          <TouchableOpacity
            style={[
              s.actionBtn,
              !lightsOffTime ? s.actionBtnDisabled : asleepTime ? s.actionBtnDone : s.actionBtnActive,
            ]}
            onPress={handleAsleepPress}
            activeOpacity={0.7}
            disabled={!lightsOffTime || !!asleepTime}
          >
            <View style={[
              s.iconCircle,
              !lightsOffTime ? s.iconCircleDisabled : asleepTime ? s.iconCircleDone : s.iconCircleActive,
            ]}>
              <Text style={[s.iconText, !lightsOffTime && { color: THEME.textDisabled }]}>
                {asleepTime ? '✓' : '○'}
              </Text>
            </View>
            {asleepTime && (
              <View style={s.timeBadge}>
                <Text style={s.timeBadgeText}>{formatTime(asleepTime)}</Text>
              </View>
            )}
            <Text style={[s.btnLabel, !lightsOffTime && { color: THEME.textDisabled }, asleepTime && s.btnLabelDone]}>
              Asleep
            </Text>
            <Text style={[s.btnSub, !lightsOffTime && { color: THEME.textDisabled }]}>I left the room</Text>
          </TouchableOpacity>
        </View>

        {/* Saved state */}
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

        {/* Open sheet again if saved */}
        {asleepTime && !sheetVisible && !saved && (
          <TouchableOpacity style={s.viewEntryBtn} onPress={openSheet}>
            <Text style={s.viewEntryText}>View entry</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Bottom Sheet */}
      <Modal visible={sheetVisible} transparent animationType="none" onRequestClose={closeSheet}>
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={closeSheet} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}
        >
          <Animated.View style={[s.sheet, { transform: [{ translateY: slideAnim }] }]}>
            <View style={s.sheetHandle} />

            {/* Result */}
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

            {/* Time rows */}
            <View style={s.timeRows}>
              {asleepTime && (
                <View style={s.timeRow}>
                  <Text style={s.timeRowLabel}>🔒  Asleep</Text>
                  <Text style={s.timeRowValue}>{formatTime(asleepTime)}</Text>
                </View>
              )}
              {lightsOffTime && (
                <View style={[s.timeRow, { borderBottomWidth: 0 }]}>
                  <Text style={s.timeRowLabel}>🔒  Lights off</Text>
                  <Text style={s.timeRowValue}>{formatTime(lightsOffTime)}</Text>
                </View>
              )}
            </View>

            {/* Tags */}
            <Text style={s.tagsLabel}>Events</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
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

            {/* Actions */}
            <TouchableOpacity style={s.saveBtn} onPress={saveEntry} disabled={saving}>
              <Text style={s.saveBtnText}>{saving ? 'Saving...' : 'Save'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.resetSheetBtn} onPress={reset}>
              <Text style={s.resetSheetText}>Reset</Text>
            </TouchableOpacity>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.bg },
  inner: { flex: 1, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16 },

  header: { marginBottom: 0 },
  heading: { fontSize: 36, fontWeight: '700', color: THEME.textPrimary, letterSpacing: -0.5 },
  date: { fontSize: 15, color: THEME.textSecondary, marginTop: 4 },
  textFaded: { color: 'rgba(255,255,255,0.2)' },
  textMoreFaded: { color: 'rgba(255,255,255,0.1)' },

  timerArea: { flex: 1, justifyContent: 'center', alignItems: 'flex-start', paddingVertical: 20 },
  timerRow: { flexDirection: 'row', alignItems: 'baseline' },
  timerMins: { fontSize: 72, fontWeight: '700', color: THEME.textPrimary, letterSpacing: -4 },
  timerColon: { fontSize: 52, fontWeight: '300', color: THEME.textSecondary, marginHorizontal: 2, marginBottom: 4 },
  timerSecs: { fontSize: 36, fontWeight: '300', color: THEME.textSecondary },
  timerIdle: { fontSize: 72, fontWeight: '700', color: 'rgba(255,255,255,0.1)', letterSpacing: -4 },
  timerIdleColon: { fontSize: 72, fontWeight: '700', color: 'rgba(255,255,255,0.06)' },

  buttonGroup: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  actionBtn: {
    flex: 1, borderRadius: 18, padding: 18,
    borderWidth: 1, minHeight: 130,
  },
  actionBtnActive: { backgroundColor: THEME.surface, borderColor: 'rgba(255,255,255,0.2)' },
  actionBtnDone: { backgroundColor: THEME.surface, borderColor: 'rgba(255,255,255,0.08)' },
  actionBtnDisabled: { backgroundColor: 'rgba(28,28,30,0.4)', borderColor: 'rgba(255,255,255,0.04)' },

  iconCircle: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginBottom: 24,
  },
  iconCircleActive: { borderColor: THEME.textPrimary },
  iconCircleDone: { borderColor: THEME.textSecondary },
  iconCircleDisabled: { borderColor: THEME.textDisabled },
  iconText: { fontSize: 14, color: THEME.textPrimary, fontWeight: '600' },

  timeBadge: {
    position: 'absolute', top: 14, right: 14,
    backgroundColor: THEME.green, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  timeBadgeText: { fontSize: 11, fontWeight: '600', color: '#000' },

  btnLabel: { fontSize: 17, fontWeight: '600', color: THEME.textPrimary },
  btnLabelDone: { color: THEME.textSecondary },
  btnSub: { fontSize: 12, color: THEME.textSecondary, marginTop: 2 },
  btnSubDone: { color: THEME.textDisabled },

  savedRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  savedBadge: { backgroundColor: 'rgba(48,209,88,0.15)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  savedText: { color: THEME.green, fontSize: 14, fontWeight: '600' },
  resetText: { fontSize: 14, color: THEME.textSecondary },

  viewEntryBtn: { alignItems: 'center', paddingVertical: 8 },
  viewEntryText: { fontSize: 14, color: THEME.textSecondary },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: '#1c1c1e',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 48,
  },
  sheetHandle: { width: 36, height: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 2, alignSelf: 'center', marginBottom: 24 },

  resultRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 10 },
  resultNum: { fontSize: 48, fontWeight: '700', color: THEME.textPrimary, letterSpacing: -2 },
  resultUnit: { fontSize: 18, color: THEME.textSecondary, marginLeft: 4 },
  optimalBadge: { backgroundColor: THEME.green, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, alignSelf: 'flex-start', marginBottom: 20 },
  optimalText: { fontSize: 13, fontWeight: '600', color: '#000' },

  timeRows: { backgroundColor: '#2c2c2e', borderRadius: 14, marginBottom: 20 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.06)' },
  timeRowLabel: { fontSize: 15, color: THEME.textSecondary },
  timeRowValue: { fontSize: 15, fontWeight: '600', color: THEME.textPrimary },

  tagsLabel: { fontSize: 12, color: THEME.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  tagRow: { flexDirection: 'row', gap: 8 },
  tag: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  tagActive: { backgroundColor: THEME.green, borderColor: THEME.green },
  tagCheck: { fontSize: 13, color: '#000', fontWeight: '700' },
  tagText: { fontSize: 14, color: THEME.textSecondary },
  tagTextActive: { color: '#000', fontWeight: '600' },

  saveBtn: { backgroundColor: THEME.textPrimary, borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 10 },
  saveBtnText: { color: '#000', fontSize: 16, fontWeight: '700' },
  resetSheetBtn: { alignItems: 'center', padding: 12 },
  resetSheetText: { fontSize: 15, color: THEME.textSecondary },
});