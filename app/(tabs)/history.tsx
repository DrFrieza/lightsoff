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

const latencyColor = (min: number) => min <= 20 ? 'green' : min <= 35 ? 'amber' : 'red';

const COLORS = {
  green: { bg: '#0D3D2A', border: '#1D9E75', text: '#5DCAA5' },
  amber: { bg: '#3D2A05', border: '#EF9F27', text: '#FAC775' },
  red:   { bg: '#3D0D0D', border: '#E24B4A', text: '#F09595' },
};

const calcLatency = (entry: BedtimeEntry) => {
  if (!entry.asleep_time) return null;
  return Math.round((new Date(entry.asleep_time).getTime() - new Date(entry.lights_off_time).getTime()) / 60000);
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
    const { data: children } = await supabase.from('children').select('*').eq('user_id', user.id).limit(1);
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

  const toggleTag = (tag: string) => {
    setEditTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const parseTimeToISO = (date: string, timeStr: string) => {
    const [h, m] = timeStr.replace(/[ap]m/i, '').trim().split(':').map(Number);
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
      if (error) { Alert.alert('Error', error.message); }
      else { await loadEntries(); closeSheet(); }
    } catch { Alert.alert('Error', 'Invalid time format. Use HH:MM'); }
    setSaving(false);
  };

  const deleteEntry = async () => {
    if (!selectedDay || !userId) return;
    Alert.alert('Delete entry', 'Remove this night\'s data?', [
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
  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };
  const dateKey = (day: number) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const todayKey = toLocalISODate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const selectedEntry = selectedDay ? entries[selectedDay] : null;
  const selectedLatency = selectedEntry ? calcLatency(selectedEntry) : null;

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.heading}>History</Text>

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
          <ActivityIndicator color="#7f77dd" style={{ marginTop: 40 }} />
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
                    color ? { backgroundColor: color.bg, borderColor: color.border, borderWidth: 1 } : isToday ? s.cellToday : s.cellEmpty2,
                  ]}
                  onPress={() => openSheet(key)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    s.dayNum,
                    color ? { color: color.text } : isToday ? { color: '#afa9ec' } : { color: '#555' }
                  ]}>
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={s.legend}>
          {([['green', '≤20 min'], ['amber', '21–35 min'], ['red', '35+ min']] as [keyof typeof COLORS, string][]).map(([key, label]) => (
            <View key={label} style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: COLORS[key].border }]} />
              <Text style={s.legendText}>{label}</Text>
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
              {selectedDay ? new Date(selectedDay + 'T12:00:00').toLocaleDateString([], {
                weekday: 'long', month: 'long', day: 'numeric'
              }) : ''}
            </Text>
            {selectedEntry && (
              <TouchableOpacity onPress={deleteEntry}>
                <Text style={s.deleteText}>Delete</Text>
              </TouchableOpacity>
            )}
          </View>

          {selectedLatency !== null && (
            <View style={s.sheetResult}>
              <Text style={s.sheetResultNum}>{selectedLatency} min</Text>
              <Text style={s.sheetResultLabel}>to fall asleep</Text>
            </View>
          )}

          <View style={s.sheetFields}>
            <View style={s.fieldRow}>
              <Text style={s.fieldLabel}>Lights off</Text>
              <TextInput
                style={s.fieldInput}
                value={editLightsOff}
                onChangeText={setEditLightsOff}
                placeholder="e.g. 19:30"
                placeholderTextColor="#444"
                keyboardType="numbers-and-punctuation"
              />
            </View>
            <View style={[s.fieldRow, { borderBottomWidth: 0 }]}>
              <Text style={s.fieldLabel}>Asleep</Text>
              <TextInput
                style={s.fieldInput}
                value={editAsleep}
                onChangeText={setEditAsleep}
                placeholder="e.g. 19:52"
                placeholderTextColor="#444"
                keyboardType="numbers-and-punctuation"
              />
            </View>
          </View>

          <Text style={s.tagsLabel}>Tags</Text>
          <View style={s.tagRow}>
            {TAGS.map(tag => (
              <TouchableOpacity
                key={tag}
                style={[s.tag, editTags.includes(tag) && s.tagActive]}
                onPress={() => toggleTag(tag)}
              >
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
  container: { flex: 1, backgroundColor: '#0f0f14' },
  scroll: { padding: 24, paddingTop: 48, paddingBottom: 60 },
  heading: { fontSize: 34, fontWeight: '700', color: '#fff', marginBottom: 24 },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  navBtn: { padding: 8 },
  arrow: { fontSize: 32, color: '#afa9ec', lineHeight: 36 },
  monthLabel: { fontSize: 18, fontWeight: '600', color: '#fff' },
  dayHeaders: { flexDirection: 'row', marginBottom: 8 },
  dayHeader: { flex: 1, textAlign: 'center', fontSize: 11, color: '#444', fontWeight: '600', textTransform: 'uppercase' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
cell: {
  width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center',
  borderRadius: 12, padding: 2,
},
cellEmpty: { width: '14.28%', aspectRatio: 1 },
cellEmpty2: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  cellToday: { borderWidth: 1, borderColor: '#7f77dd', backgroundColor: '#1a1a2e' },
  dayNum: { fontSize: 15, fontWeight: '600' },
  legend: { flexDirection: 'row', gap: 16, marginTop: 20, marginBottom: 8, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, color: '#555' },
  hint: { textAlign: 'center', color: '#333', fontSize: 13, marginTop: 8 },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: '#16161f',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 48,
  },
  sheetHandle: {
    width: 40, height: 4, backgroundColor: '#333',
    borderRadius: 2, alignSelf: 'center', marginBottom: 20,
  },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sheetDate: { fontSize: 17, fontWeight: '600', color: '#fff' },
  deleteText: { fontSize: 14, color: '#e24b4a' },
  sheetResult: {
    backgroundColor: '#1a1a2e', borderRadius: 12, padding: 16,
    alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#2a2a3e',
  },
  sheetResultNum: { fontSize: 36, fontWeight: '700', color: '#afa9ec' },
  sheetResultLabel: { fontSize: 13, color: '#666', marginTop: 2 },
  sheetFields: {
    backgroundColor: '#1a1a2e', borderRadius: 12,
    borderWidth: 1, borderColor: '#2a2a3e', marginBottom: 20,
  },
  fieldRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#2a2a3e',
  },
  fieldLabel: { fontSize: 15, color: '#888' },
  fieldInput: {
    fontSize: 15, fontWeight: '600', color: '#fff',
    textAlign: 'right', minWidth: 80,
  },
  tagsLabel: { fontSize: 12, color: '#555', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  tag: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: '#2a2a3e' },
  tagActive: { backgroundColor: '#26215c', borderColor: '#7f77dd' },
  tagText: { fontSize: 14, color: '#555' },
  tagTextActive: { color: '#afa9ec' },
  saveBtn: { backgroundColor: '#7f77dd', borderRadius: 14, padding: 16, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});