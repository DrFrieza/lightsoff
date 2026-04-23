import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { supabase } from '../../lib/supabase';
import { BedtimeEntry } from '../../lib/types';

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
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
  red: '#ff453a',
  amber: '#ffd60a',
};

type ColorKey = 'green' | 'amber' | 'red';

const COLORS: Record<ColorKey, { bg: string; border: string; text: string }> = {
  green: { bg: '#0D3D2A', border: '#1D9E75', text: '#5DCAA5' },
  amber: { bg: '#3D2A05', border: '#EF9F27', text: '#FAC775' },
  red:   { bg: '#3D0D0D', border: '#E24B4A', text: '#F09595' },
};

const latencyColor = (min: number): ColorKey =>
  min <= 20 ? 'green' : min <= 35 ? 'amber' : 'red';

const calcLatency = (entry: BedtimeEntry) => {
  if (!entry.asleep_time) return null;
  return Math.round(
    (new Date(entry.asleep_time).getTime() - new Date(entry.lights_off_time).getTime()) / 60000
  );
};

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const toLocalISODate = () => new Date().toLocaleDateString('en-CA');

export default function HistoryScreen() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [entries, setEntries] = useState<Record<string, BedtimeEntry>>({});
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [childId, setChildId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editLightsOff, setEditLightsOff] = useState('');
  const [editAsleep, setEditAsleep] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const slideAnim = useRef(new Animated.Value(600)).current;

  useEffect(() => { initUser(); }, []);

  const initUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
    const { data: children } = await supabase
      .from('children').select('*').eq('user_id', user.id).limit(1);
    if (children && children.length > 0) setChildId(children[0].id);
  };

  const loadEntries = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const from = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const to = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    const { data } = await supabase
      .from('bedtime_entries').select('*')
      .eq('user_id', user.id).gte('date', from).lte('date', to);
    if (data) {
      const map: Record<string, BedtimeEntry> = {};
      data.forEach(e => { map[e.date] = e; });
      setEntries(map);
    }
    setLoading(false);
  };

  useFocusEffect(useCallback(() => {
    loadEntries();
    return () => {};
  }, [year, month]));

  const openSheet = (dateKey: string) => {
    setSelectedDay(dateKey);
    const entry = entries[dateKey];
    if (entry) {
      setEditLightsOff(formatTime(entry.lights_off_time));
      setEditAsleep(entry.asleep_time ? formatTime(entry.asleep_time) : '');
      setEditTags(entry.tags || []);
    } else {
      setEditLightsOff('');
      setEditAsleep('');
      setEditTags([]);
    }
    setSheetVisible(true);
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start();
  };

  const closeSheet = () => {
    Animated.timing(slideAnim, { toValue: 600, duration: 250, useNativeDriver: true }).start(() => {
      setSheetVisible(false);
      setSelectedDay(null);
    });
  };

  const toggleTag = (tag: string) =>
    setEditTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);

  const parseTimeToISO = (date: string, timeStr: string) => {
    const cleaned = timeStr.replace(/[ap]m/i, '').trim();
    const [h, m] = cleaned.split(':').map(Number);
    const d = new Date(`${date}T00:00:00`);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  };

  const saveSheet = async () => {
    if (!selectedDay || !userId || !childId || !editLightsOff) return;
    setSaving(true);
    try {
      const lightsOffISO = parseTimeToISO(selectedDay, editLightsOff);
      const asleepISO = editAsleep ? parseTimeToISO(selectedDay, editAsleep) : null;
      const { error } = await supabase.from('bedtime_entries').upsert({
        user_id: userId,
        child_id: childId,
        date: selectedDay,
        lights_off_time: lightsOffISO,
        asleep_time: asleepISO,
        tags: editTags,
      }, { onConflict: 'child_id,date' });
      if (error) Alert.alert('Error', error.message);
      else { await loadEntries(); closeSheet(); }
    } catch {
      Alert.alert('Error', 'Invalid time format. Use HH:MM');
    }
    setSaving(false);
  };

  const deleteEntry = async () => {
    if (!selectedDay || !userId) return;
    Alert.alert('Delete entry', "Remove this night's data?", [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await supabase.from('bedtime_entries').delete()
          .eq('user_id', userId).eq('date', selectedDay);
        await loadEntries();
        closeSheet();
      }},
    ]);
  };

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };
  const dateKey = (day: number) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const todayKey = toLocalISODate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const selectedEntry = selectedDay ? entries[selectedDay] : null;
  const selectedLatency = selectedEntry ? calcLatency(selectedEntry) : null;

  // Stats
  const allEntries = Object.values(entries);
  const withLatency = allEntries.map(e => calcLatency(e)).filter((l): l is number => l !== null);
  const avg = withLatency.length
    ? Math.round(withLatency.reduce((a, b) => a + b, 0) / withLatency.length) : null;
  const fastest = withLatency.length ? Math.min(...withLatency) : null;
  const tagLatency: Record<string, number[]> = {};
  allEntries.forEach(e => {
    const l = calcLatency(e);
    if (l === null) return;
    (e.tags || []).forEach(tag => {
      if (!tagLatency[tag]) tagLatency[tag] = [];
      tagLatency[tag].push(l);
    });
  });
  const worstTag = Object.entries(tagLatency)
    .map(([tag, lats]) => ({ tag, avg: Math.round(lats.reduce((a, b) => a + b, 0) / lats.length) }))
    .sort((a, b) => b.avg - a.avg)[0];

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll}>

        <Text style={s.heading}>History</Text>

        {/* Stats bar */}
        {withLatency.length > 0 && (
          <View style={s.statsBar}>
            <View style={s.statItem}>
              <Text style={s.statValue}>{avg !== null ? `${avg} min` : '—'}</Text>
              <Text style={s.statLabel}>Average</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <Text style={s.statValue}>{fastest !== null ? `${fastest} min` : '—'}</Text>
              <Text style={s.statLabel}>Fastest</Text>
            </View>
            {worstTag && (
              <>
                <View style={s.statDivider} />
                <View style={s.statItem}>
                  <Text style={[s.statValue, { color: THEME.red }]}>{worstTag.tag}</Text>
                  <Text style={s.statLabel}>Avoid tag</Text>
                </View>
              </>
            )}
          </View>
        )}

        {/* Month nav */}
        <View style={s.monthNav}>
          <TouchableOpacity onPress={prevMonth} style={s.navBtn}>
            <Text style={s.arrow}>‹</Text>
          </TouchableOpacity>
          <Text style={s.monthLabel}>{MONTHS[month]} {year}</Text>
          <TouchableOpacity onPress={nextMonth} style={s.navBtn}>
            <Text style={s.arrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Day headers */}
        <View style={s.dayHeaders}>
          {DAYS.map(d => <Text key={d} style={s.dayHeader}>{d}</Text>)}
        </View>

        {/* Calendar grid */}
        {loading ? (
          <ActivityIndicator color={THEME.textSecondary} style={{ marginTop: 40 }} />
        ) : (
          <View style={s.grid}>
            {cells.map((day, i) => {
              if (!day) return <View key={`e-${i}`} style={s.cellEmpty} />;
              const key = dateKey(day);
              const entry = entries[key];
              const latency = entry ? calcLatency(entry) : null;
              const colorKey = latency !== null ? latencyColor(latency) : null;
              const color = colorKey ? COLORS[colorKey] : null;
              const isToday = key === todayKey;
              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    s.cell,
                    color
                      ? { backgroundColor: color.bg, borderColor: color.border, borderWidth: 1 }
                      : isToday
                        ? s.cellToday
                        : s.cellDefault,
                  ]}
                  onPress={() => openSheet(key)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    s.dayNum,
                    color
                      ? { color: color.text }
                      : isToday
                        ? { color: THEME.textPrimary }
                        : { color: THEME.textSecondary }
                  ]}>
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Legend */}
        <View style={s.legend}>
          {(['green', 'amber', 'red'] as ColorKey[]).map((key) => (
            <View key={key} style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: COLORS[key].border }]} />
              <Text style={s.legendText}>
                {key === 'green' ? '≤20 min' : key === 'amber' ? '21–35 min' : '35+ min'}
              </Text>
            </View>
          ))}
        </View>

        <Text style={s.hint}>Tap any day to add or edit</Text>
      </ScrollView>

      {/* Bottom Sheet */}
      <Modal visible={sheetVisible} transparent animationType="none" onRequestClose={closeSheet}>
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={closeSheet} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}
        >
          <Animated.View style={[s.sheet, { transform: [{ translateY: slideAnim }] }]}>
            <View style={s.sheetHandle} />

            <View style={s.sheetHeader}>
              <Text style={s.sheetDate}>
                {selectedDay
                  ? new Date(selectedDay + 'T12:00:00').toLocaleDateString([], {
                      weekday: 'long', month: 'long', day: 'numeric'
                    })
                  : ''}
              </Text>
              {selectedEntry && (
                <TouchableOpacity onPress={deleteEntry}>
                  <Text style={s.deleteText}>Delete</Text>
                </TouchableOpacity>
              )}
            </View>

            {selectedLatency !== null && (
              <View style={s.resultRow}>
                <Text style={s.resultNum}>{selectedLatency}</Text>
                <Text style={s.resultUnit}> min to fall asleep</Text>
              </View>
            )}

            <View style={s.timeRows}>
              <View style={s.timeRow}>
                <Text style={s.timeRowLabel}>Lights off</Text>
                <TextInput
                  style={s.timeInput}
                  value={editLightsOff}
                  onChangeText={setEditLightsOff}
                  placeholder="e.g. 19:30"
                  placeholderTextColor={THEME.textDisabled}
                  keyboardType="numbers-and-punctuation"
                />
              </View>
              <View style={[s.timeRow, { borderBottomWidth: 0 }]}>
                <Text style={s.timeRowLabel}>Asleep</Text>
                <TextInput
                  style={s.timeInput}
                  value={editAsleep}
                  onChangeText={setEditAsleep}
                  placeholder="e.g. 19:52"
                  placeholderTextColor={THEME.textDisabled}
                  keyboardType="numbers-and-punctuation"
                />
              </View>
            </View>

            <Text style={s.tagsLabel}>Events</Text>
            <View style={s.tagRow}>
              {TAGS.map(tag => (
                <TouchableOpacity
                  key={tag}
                  style={[s.tag, editTags.includes(tag) && s.tagActive]}
                  onPress={() => toggleTag(tag)}
                >
                  {editTags.includes(tag) && <Text style={s.tagCheck}>✓ </Text>}
                  <Text style={[s.tagText, editTags.includes(tag) && s.tagTextActive]}>{tag}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={s.saveBtn} onPress={saveSheet} disabled={saving}>
              <Text style={s.saveBtnText}>{saving ? 'Saving...' : selectedEntry ? 'Update' : 'Save night'}</Text>
            </TouchableOpacity>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.bg },
  scroll: { padding: 24, paddingTop: 48, paddingBottom: 60 },
  heading: { fontSize: 34, fontWeight: '700', color: THEME.textPrimary, marginBottom: 20 },

  statsBar: { flexDirection: 'row', alignItems: 'center', marginBottom: 32, paddingVertical: 4 },
  statItem: { flex: 1 },
  statValue: { fontSize: 20, fontWeight: '700', color: THEME.textPrimary, marginBottom: 4 },
  statLabel: { fontSize: 13, color: THEME.textSecondary },
  statDivider: { width: 0.5, height: 36, backgroundColor: 'rgba(255,255,255,0.12)', marginHorizontal: 16 },

  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  navBtn: { padding: 8 },
  arrow: { fontSize: 32, color: THEME.textSecondary, lineHeight: 36 },
  monthLabel: { fontSize: 17, fontWeight: '600', color: THEME.textPrimary },

  dayHeaders: { flexDirection: 'row', marginBottom: 8 },
  dayHeader: { flex: 1, textAlign: 'center', fontSize: 11, color: THEME.textDisabled, fontWeight: '600', textTransform: 'uppercase' },

  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 12, padding: 2 },
  cellEmpty: { width: '14.28%', aspectRatio: 1 },
  cellDefault: { },
  cellToday: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: THEME.surface },
  dayNum: { fontSize: 15, fontWeight: '500' },

  legend: { flexDirection: 'row', gap: 16, marginTop: 20, marginBottom: 8, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendText: { fontSize: 12, color: THEME.textSecondary },
  hint: { textAlign: 'center', color: THEME.textDisabled, fontSize: 13, marginTop: 8 },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: THEME.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 48,
  },
  sheetHandle: { width: 36, height: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sheetDate: { fontSize: 17, fontWeight: '600', color: THEME.textPrimary },
  deleteText: { fontSize: 14, color: THEME.red },

  resultRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 20 },
  resultNum: { fontSize: 48, fontWeight: '700', color: THEME.textPrimary, letterSpacing: -2 },
  resultUnit: { fontSize: 18, color: THEME.textSecondary, marginLeft: 4 },

  timeRows: { backgroundColor: THEME.surfaceHigh, borderRadius: 14, marginBottom: 20 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.06)' },
  timeRowLabel: { fontSize: 15, color: THEME.textSecondary },
  timeInput: { fontSize: 15, fontWeight: '600', color: THEME.textPrimary, textAlign: 'right', minWidth: 80 },

  tagsLabel: { fontSize: 12, color: THEME.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  tag: { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  tagActive: { backgroundColor: THEME.green, borderColor: THEME.green },
  tagCheck: { fontSize: 13, color: '#000', fontWeight: '700' },
  tagText: { fontSize: 14, color: THEME.textSecondary },
  tagTextActive: { color: '#000', fontWeight: '600' },

  saveBtn: { backgroundColor: THEME.textPrimary, borderRadius: 14, padding: 16, alignItems: 'center' },
  saveBtnText: { color: '#000', fontSize: 16, fontWeight: '700' },
});