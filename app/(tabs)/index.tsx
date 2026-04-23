import { useEffect, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';

const TAGS = ['Sick', 'Travel', 'Visitors', 'Night out'];

export default function TonightScreen() {
  const [lightsOffTime, setLightsOffTime] = useState<Date | null>(null);
  const [asleepTime, setAsleepTime] = useState<Date | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [childId, setChildId] = useState<string | null>(null);
  const [childName, setChildName] = useState<string>('');

  useEffect(() => {
    loadOrCreateChild();
  }, []);

  const loadOrCreateChild = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: children } = await supabase
      .from('children')
      .select('*')
      .eq('user_id', user.id)
      .limit(1);

    if (children && children.length > 0) {
      setChildId(children[0].id);
      setChildName(children[0].name);
    } else {
      const { data: newChild } = await supabase
        .from('children')
        .insert({ user_id: user.id, name: 'My Child' })
        .select()
        .single();
      if (newChild) {
        setChildId(newChild.id);
        setChildName(newChild.name);
      }
    }
  };

  const formatTime = (date: Date) =>
    date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const getLatency = () => {
    if (!lightsOffTime || !asleepTime) return null;
    return Math.round((asleepTime.getTime() - lightsOffTime.getTime()) / 60000);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const saveEntry = async () => {
    if (!lightsOffTime || !asleepTime || !childId) return;
    setSaving(true);

    const today = new Date().toISOString().split('T')[0];
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('bedtime_entries')
      .upsert({
        user_id: user.id,
        child_id: childId,
        date: today,
        lights_off_time: lightsOffTime.toISOString(),
        asleep_time: asleepTime.toISOString(),
        tags: selectedTags,
      }, { onConflict: 'child_id,date' });

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setSaved(true);
    }
    setSaving(false);
  };

  const reset = () => {
    setLightsOffTime(null);
    setAsleepTime(null);
    setSelectedTags([]);
    setSaved(false);
  };

  const latency = getLatency();
  const today = new Date().toLocaleDateString([], {
    weekday: 'long', month: 'long', day: 'numeric'
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.date}>{today}</Text>
        <Text style={styles.heading}>Tonight</Text>
        {childName ? <Text style={styles.childLabel}>{childName}</Text> : null}

        {latency !== null && (
          <View style={styles.resultCard}>
            <Text style={styles.resultNumber}>{latency} min</Text>
            <Text style={styles.resultLabel}>to fall asleep</Text>
          </View>
        )}

        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={[styles.bigButton, lightsOffTime ? styles.buttonDone : styles.buttonPrimary]}
            onPress={() => !lightsOffTime && setLightsOffTime(new Date())}
            activeOpacity={0.8}
          >
            <Text style={styles.bigButtonIcon}>🌙</Text>
            <Text style={styles.bigButtonLabel}>Lights off</Text>
            {lightsOffTime && (
              <Text style={styles.bigButtonTime}>{formatTime(lightsOffTime)}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.bigButton,
              !lightsOffTime ? styles.buttonDisabled : asleepTime ? styles.buttonDone : styles.buttonSecondary,
            ]}
            onPress={() => lightsOffTime && !asleepTime && setAsleepTime(new Date())}
            activeOpacity={0.8}
            disabled={!lightsOffTime || !!asleepTime}
          >
            <Text style={styles.bigButtonIcon}>😴</Text>
            <Text style={styles.bigButtonLabel}>Asleep</Text>
            <Text style={styles.bigButtonSub}>I left the room</Text>
            {asleepTime && (
              <Text style={styles.bigButtonTime}>{formatTime(asleepTime)}</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>Tags (optional)</Text>
        <View style={styles.tagRow}>
          {TAGS.map(tag => (
            <TouchableOpacity
              key={tag}
              style={[styles.tag, selectedTags.includes(tag) && styles.tagActive]}
              onPress={() => toggleTag(tag)}
            >
              <Text style={[styles.tagText, selectedTags.includes(tag) && styles.tagTextActive]}>
                {tag}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {lightsOffTime && asleepTime && !saved && (
          <TouchableOpacity style={styles.saveButton} onPress={saveEntry} disabled={saving}>
            <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save tonight'}</Text>
          </TouchableOpacity>
        )}

        {saved && (
          <View style={styles.savedBadge}>
            <Text style={styles.savedText}>✓ Saved</Text>
          </View>
        )}

        {(lightsOffTime || asleepTime) && (
          <TouchableOpacity style={styles.resetButton} onPress={reset}>
            <Text style={styles.resetText}>Reset tonight</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f14' },
  scroll: { padding: 24, paddingTop: 48 },
  date: { fontSize: 14, color: '#888', marginBottom: 4 },
  heading: { fontSize: 34, fontWeight: '700', color: '#fff', marginBottom: 4 },
  childLabel: { fontSize: 14, color: '#7f77dd', marginBottom: 24 },
  resultCard: {
    backgroundColor: '#1a1a2e', borderRadius: 16, padding: 24,
    alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: '#7f77dd',
  },
  resultNumber: { fontSize: 48, fontWeight: '700', color: '#afa9ec' },
  resultLabel: { fontSize: 16, color: '#888', marginTop: 4 },
  buttonGroup: { gap: 16, marginBottom: 32 },
  bigButton: { borderRadius: 20, padding: 28, alignItems: 'center', borderWidth: 1 },
  buttonPrimary: { backgroundColor: '#1a1a2e', borderColor: '#7f77dd' },
  buttonSecondary: { backgroundColor: '#1a1a2e', borderColor: '#444' },
  buttonDone: { backgroundColor: '#1a1a2e', borderColor: '#1d9e75' },
  buttonDisabled: { backgroundColor: '#1a1a2e', borderColor: '#222', opacity: 0.4 },
  bigButtonIcon: { fontSize: 32, marginBottom: 8 },
  bigButtonLabel: { fontSize: 20, fontWeight: '600', color: '#fff' },
  bigButtonSub: { fontSize: 13, color: '#666', marginTop: 2 },
  bigButtonTime: { fontSize: 15, color: '#1d9e75', marginTop: 8, fontWeight: '600' },
  sectionLabel: { fontSize: 13, color: '#666', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 32 },
  tag: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#333' },
  tagActive: { backgroundColor: '#26215c', borderColor: '#7f77dd' },
  tagText: { fontSize: 14, color: '#666' },
  tagTextActive: { color: '#afa9ec' },
  saveButton: {
    backgroundColor: '#7f77dd', borderRadius: 14,
    padding: 18, alignItems: 'center', marginBottom: 16,
  },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  savedBadge: {
    backgroundColor: '#0f6e56', borderRadius: 14,
    padding: 18, alignItems: 'center', marginBottom: 16,
  },
  savedText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  resetButton: { alignItems: 'center', paddingVertical: 16 },
  resetText: { fontSize: 14, color: '#555' },
});