import { useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const MOCK_ENTRIES: Record<string, { lightsOff: string; asleep: string; latency: number; tags: string[] }> = {
  '2026-04-20': { lightsOff: '19:45', asleep: '20:02', latency: 17, tags: [] },
  '2026-04-21': { lightsOff: '20:00', asleep: '20:35', latency: 35, tags: ['Visitors'] },
  '2026-04-22': { lightsOff: '19:30', asleep: '19:48', latency: 18, tags: [] },
  '2026-04-19': { lightsOff: '19:45', asleep: '20:10', latency: 25, tags: ['Sick'] },
  '2026-04-17': { lightsOff: '20:15', asleep: '21:00', latency: 45, tags: ['Night out'] },
  '2026-04-15': { lightsOff: '19:30', asleep: '19:42', latency: 12, tags: [] },
  '2026-04-14': { lightsOff: '19:45', asleep: '20:05', latency: 20, tags: [] },
};

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const latencyColor = (min: number) => min <= 20 ? '#1d9e75' : min <= 35 ? '#ef9f27' : '#e24b4a';

export default function HistoryScreen() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y-1); } else setMonth(m => m-1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y+1); } else setMonth(m => m+1); };
  const dateKey = (day: number) => `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const selectedEntry = selectedDay ? MOCK_ENTRIES[selectedDay] : null;

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

        <View style={s.grid}>
          {cells.map((day, i) => {
            if (!day) return <View key={`e-${i}`} style={s.cell} />;
            const key = dateKey(day);
            const entry = MOCK_ENTRIES[key];
            const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            const isSelected = selectedDay === key;
            return (
              <TouchableOpacity key={key} style={[s.cell, isSelected && s.cellSelected]} onPress={() => setSelectedDay(isSelected ? null : key)}>
                <Text style={[s.dayNum, isToday && s.dayToday]}>{day}</Text>
                {entry && <View style={[s.dot, { backgroundColor: latencyColor(entry.latency) }]} />}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={s.legend}>
          {[['#1d9e75','≤20 min'],['#ef9f27','21–35 min'],['#e24b4a','35+ min']].map(([color, label]) => (
            <View key={label} style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: color }]} />
              <Text style={s.legendText}>{label}</Text>
            </View>
          ))}
        </View>

        {selectedEntry && selectedDay ? (
          <View style={s.card}>
            <Text style={s.cardDate}>
              {new Date(selectedDay + 'T12:00:00').toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>
            {[
              ['Lights off', selectedEntry.lightsOff, '#ccc'],
              ['Asleep', selectedEntry.asleep, '#ccc'],
              ['Time to fall asleep', `${selectedEntry.latency} min`, latencyColor(selectedEntry.latency)],
            ].map(([label, value, color]) => (
              <View key={label as string} style={s.row}>
                <Text style={s.rowLabel}>{label}</Text>
                <Text style={[s.rowValue, { color: color as string }]}>{value}</Text>
              </View>
            ))}
            {selectedEntry.tags.length > 0 && (
              <View style={s.tags}>
                {selectedEntry.tags.map(t => (
                  <View key={t} style={s.tag}><Text style={s.tagText}>{t}</Text></View>
                ))}
              </View>
            )}
          </View>
        ) : (
          <Text style={s.hint}>Tap a day to see details</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f14' },
  scroll: { padding: 24, paddingTop: 48 },
  heading: { fontSize: 34, fontWeight: '700', color: '#fff', marginBottom: 24 },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  navBtn: { padding: 8 },
  arrow: { fontSize: 32, color: '#afa9ec', lineHeight: 36 },
  monthLabel: { fontSize: 18, fontWeight: '600', color: '#fff' },
  dayHeaders: { flexDirection: 'row', marginBottom: 8 },
  dayHeader: { flex: 1, textAlign: 'center', fontSize: 11, color: '#555', fontWeight: '600', textTransform: 'uppercase' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  cellSelected: { backgroundColor: '#1a1a2e', borderWidth: 1, borderColor: '#7f77dd' },
  dayNum: { fontSize: 15, color: '#ccc' },
  dayToday: { color: '#afa9ec', fontWeight: '700' },
  dot: { width: 5, height: 5, borderRadius: 3, marginTop: 2 },
  legend: { flexDirection: 'row', gap: 16, marginTop: 16, marginBottom: 28, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, color: '#555' },
  card: { backgroundColor: '#1a1a2e', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#2a2a3e' },
  cardDate: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#2a2a3e' },
  rowLabel: { fontSize: 14, color: '#666' },
  rowValue: { fontSize: 14, fontWeight: '600' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  tag: { backgroundColor: '#26215c', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 },
  tagText: { fontSize: 12, color: '#afa9ec' },
  hint: { textAlign: 'center', color: '#444', fontSize: 14, marginTop: 16 },
});