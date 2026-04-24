import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
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
import { formatTimeInput } from '../../lib/inputFormatters';
import { supabase } from '../../lib/supabase';
import tokens from '../../lib/tokens';
import { BedtimeEntry } from '../../lib/types';

const CELL_SIZE = Math.floor((Dimensions.get('window').width - 48) / 7);

const t = tokens.semantic.dark;
const { spacing, radius, fontSize, fontWeight, motion, component } = tokens;

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = ['January','February','March','April','May','June',
  'July','August','September','October','November','December'];
const TAGS = ['Sick', 'Travel', 'Visitors', 'Night out'];

type ColorKey = 'green' | 'amber' | 'red';

const ENTRY_COLORS: Record<ColorKey, { bg: string; border: string; text: string }> = {
  green: { bg: '#0D3D2A', border: '#1D9E75', text: '#5DCAA5' },
  amber: { bg: '#3D2A05', border: '#EF9F27', text: '#FAC775' },
  red:   { bg: '#3D0D0D', border: tokens.color.error[500], text: '#F09595' },
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
    Animated.spring(slideAnim, {
      toValue: 0, useNativeDriver: true, tension: 65, friction: 11,
    }).start();
  };

  const closeSheet = () => {
    Animated.timing(slideAnim, {
      toValue: 600, duration: motion.duration.normal, useNativeDriver: true,
    }).start(() => {
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
        user_id: userId, child_id: childId, date: selectedDay,
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
    .map(([tag, lats]) => ({
      tag, avg: Math.round(lats.reduce((a, b) => a + b, 0) / lats.length)
    }))
    .sort((a, b) => b.avg - a.avg)[0];

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.heading}>History</Text>

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
                  <Text style={[s.statValue, { color: tokens.color.error[400] }]}>
                    {worstTag.tag}
                  </Text>
                  <Text style={s.statLabel}>Avoid tag</Text>
                </View>
              </>
            )}
          </View>
        )}

        <View style={s.monthNav}>
          <TouchableOpacity onPress={prevMonth} style={s.navBtn}>
            <Text style={s.arrow}>‹</Text>
          </TouchableOpacity>
          <Text style={s.monthLabel}>{MONTHS[month]} {year}</Text>
          <TouchableOpacity onPress={nextMonth} style={s.navBtn}>
            <Text style={s.arrow}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={s.dayHeaders}>
          {DAYS.map(d => <Text key={d} style={s.dayHeader}>{d}</Text>)}
        </View>

        {loading ? (
          <ActivityIndicator color={t.textMuted} style={{ marginTop: spacing[10] }} />
        ) : (
          <View style={s.grid}>
            {cells.map((day, i) => {
              if (!day) return <View key={`e-${i}`} style={[s.cellEmpty, { width: CELL_SIZE, height: CELL_SIZE }]} />;
              const key = dateKey(day);
              const entry = entries[key];
              const latency = entry ? calcLatency(entry) : null;
              const colorKey = latency !== null ? latencyColor(latency) : null;
              const color = colorKey ? ENTRY_COLORS[colorKey] : null;
              const isToday = key === todayKey;
              return (
                <TouchableOpacity
  key={key}
  style={[
    s.cell,
    { width: CELL_SIZE, height: CELL_SIZE },
    color
      ? { backgroundColor: color.bg, borderColor: color.border, borderWidth: 1 }
      : isToday ? s.cellToday : s.cellDefault,
  ]}
  onPress={() => openSheet(key)}
  activeOpacity={0.7}
>
                  <Text style={[
                    s.dayNum,
                    color
                      ? { color: color.text }
                      : isToday ? { color: t.textPrimary } : { color: t.textSecondary },
                  ]}>
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={s.legend}>
          {(['green', 'amber', 'red'] as ColorKey[]).map((key) => (
            <View key={key} style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: ENTRY_COLORS[key].border }]} />
              <Text style={s.legendText}>
                {key === 'green' ? '≤20 min' : key === 'amber' ? '21–35 min' : '35+ min'}
              </Text>
            </View>
          ))}
        </View>

        <Text style={s.hint}>Tap any day to add or edit</Text>
      </ScrollView>

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
                  onChangeText={(v) => setEditLightsOff(formatTimeInput(editLightsOff, v))}
                  placeholder="19:30"
                  placeholderTextColor={t.textMuted}
                  keyboardType="number-pad"
                  maxLength={5}
                />
              </View>
              <View style={[s.timeRow, { borderBottomWidth: 0 }]}>
                <Text style={s.timeRowLabel}>Asleep</Text>
                <TextInput
                  style={s.timeInput}
                  value={editAsleep}
                  onChangeText={(v) => setEditAsleep(formatTimeInput(editAsleep, v))}
                  placeholder="19:52"
                  placeholderTextColor={t.textMuted}
                  keyboardType="number-pad"
                  maxLength={5}
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
                  <Text style={[s.tagText, editTags.includes(tag) && s.tagTextActive]}>
                    {tag}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={s.saveBtn} onPress={saveSheet} disabled={saving}>
              <Text style={s.saveBtnText}>
                {saving ? 'Saving...' : selectedEntry ? 'Update' : 'Save night'}
              </Text>
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
  heading: {
    fontSize: fontSize['4xl'],
    fontWeight: String(fontWeight.bold) as any,
    color: t.textPrimary, marginBottom: spacing[5],
  },

  statsBar: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing[8] },
  statItem: { flex: 1 },
  statValue: {
    fontSize: fontSize['2xl'],
    fontWeight: String(fontWeight.bold) as any,
    color: t.textPrimary, marginBottom: spacing[1],
  },
  statLabel: { fontSize: fontSize.sm, color: t.textSecondary },
  statDivider: {
    width: 0.5, height: 36,
    backgroundColor: t.divider, marginHorizontal: spacing[4],
  },

  monthNav: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: spacing[5],
  },
  navBtn: { padding: spacing[2] },
  arrow: { fontSize: 32, color: t.textSecondary, lineHeight: 36 },
  monthLabel: {
    fontSize: fontSize.lg,
    fontWeight: String(fontWeight.semibold) as any,
    color: t.textPrimary,
  },

  dayHeaders: { flexDirection: 'row', marginBottom: spacing[2] },
  dayHeader: {
    flex: 1, textAlign: 'center', fontSize: fontSize.xs,
    color: t.textMuted,
    fontWeight: String(fontWeight.semibold) as any,
    textTransform: 'uppercase',
  },

  grid: { flexDirection: 'row', flexWrap: 'wrap' },
cell: {
  width: '14.28%', aspectRatio: 1,
  alignItems: 'center', justifyContent: 'center',
  borderRadius: radius.md,
},
cell: {
  alignItems: 'center', justifyContent: 'center',
  borderRadius: radius.md,
},
cellEmpty: {},

  legend: {
    flexDirection: 'row', gap: spacing[4],
    marginTop: spacing[5], marginBottom: spacing[2], justifyContent: 'center',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  legendDot: { width: 7, height: 7, borderRadius: radius.full },
  legendText: { fontSize: fontSize.sm, color: t.textSecondary },
  hint: { textAlign: 'center', color: t.textMuted, fontSize: fontSize.sm, marginTop: spacing[2] },

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
  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: spacing[4],
  },
  sheetDate: {
    fontSize: fontSize.lg,
    fontWeight: String(fontWeight.semibold) as any,
    color: t.textPrimary,
  },
  deleteText: { fontSize: fontSize.base, color: tokens.color.error[400] },

  resultRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: spacing[5] },
  resultNum: {
    fontSize: fontSize['6xl'],
    fontWeight: String(fontWeight.bold) as any,
    color: t.textPrimary, letterSpacing: -2,
  },
  resultUnit: { fontSize: fontSize.xl, color: t.textSecondary, marginLeft: spacing[1] },

  timeRows: { backgroundColor: t.bgCard, borderRadius: radius.lg, marginBottom: spacing[5] },
  timeRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: spacing[4], borderBottomWidth: 0.5, borderBottomColor: t.divider,
  },
  timeRowLabel: { fontSize: fontSize.md, color: t.textSecondary },
  timeInput: {
    fontSize: fontSize.md,
    fontWeight: String(fontWeight.semibold) as any,
    color: t.textPrimary, textAlign: 'right', minWidth: 80,
  },

  tagsLabel: {
    fontSize: fontSize.sm, color: t.textSecondary,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing[2],
  },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginBottom: spacing[6] },
  tag: {
    flexDirection: 'row',
    paddingHorizontal: spacing[4], paddingVertical: spacing[2],
    borderRadius: radius.full, borderWidth: 1, borderColor: t.border,
  },
  tagActive: {
    backgroundColor: tokens.color.success[500],
    borderColor: tokens.color.success[500],
  },
  tagCheck: {
    fontSize: fontSize.sm, color: tokens.color.black,
    fontWeight: String(fontWeight.bold) as any,
  },
  tagText: { fontSize: fontSize.base, color: t.textSecondary },
  tagTextActive: {
    color: tokens.color.black,
    fontWeight: String(fontWeight.semibold) as any,
  },

  saveBtn: {
    backgroundColor: t.textPrimary, borderRadius: radius.md,
    height: component.button.heightLg,
    alignItems: 'center', justifyContent: 'center',
  },
  saveBtnText: {
    color: tokens.color.black, fontSize: fontSize.md,
    fontWeight: String(fontWeight.bold) as any,
  },
});