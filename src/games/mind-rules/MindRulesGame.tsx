import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { getDailyMindPuzzle, PUZZLES } from './src/data/puzzles';

const PROGRESS_KEY = 'mind-rules:active-progress:v1';
type Props = { dailyMode?: boolean; onDailyComplete?: () => void };

export default function MindRulesGame({ dailyMode = false, onDailyComplete }: Props) {
  const [level, setLevel] = useState(0);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const completedDaily = useRef(false);
  const puzzle = dailyMode ? getDailyMindPuzzle() : PUZZLES[level];
  const progress = useMemo(() => dailyMode ? 'DAILY' : `${level + 1}/${PUZZLES.length}`, [dailyMode, level]);

  useEffect(() => {
    if (dailyMode) return;
    AsyncStorage.getItem(PROGRESS_KEY).then((raw) => {
      const saved = raw ? Number(raw) : 0;
      if (Number.isInteger(saved) && saved >= 0 && saved < PUZZLES.length) setLevel(saved);
    }).catch(() => undefined);
  }, [dailyMode]);

  const checkAnswer = () => {
    if (Number(answer) === puzzle.answer) {
      setFeedback(`${puzzle.explanation ?? 'Chính xác!'} ✨`);
      if (dailyMode && !completedDaily.current) { completedDaily.current = true; onDailyComplete?.(); }
    } else { setWrongAttempts((count) => count + 1); setFeedback('Chưa đúng, thử lại nhé.'); }
  };
  const nextPuzzle = () => {
    if (dailyMode) return;
    const next = (level + 1) % PUZZLES.length;
    setLevel(next); setAnswer(''); setFeedback(''); setWrongAttempts(0); void AsyncStorage.setItem(PROGRESS_KEY, String(next));
  };
  const hasWon = feedback.includes('Đáp án') || feedback.includes('Chính xác');

  return <SafeAreaView style={styles.safe}><View style={styles.header}><Text style={styles.eyebrow}>MIND RULES · {progress}</Text><Text style={styles.title}>{puzzle.title}</Text><Text style={styles.subtitle}>{dailyMode ? 'Một thử thách mới, duy nhất cho ngày hôm nay.' : 'Tìm quy luật biến đổi của các con số.'}</Text></View>
    <View style={styles.card}>{puzzle.equations.map((equation) => <View key={equation.input} style={styles.equation}><Text style={styles.number}>{equation.input}</Text><Text style={styles.arrow}>→</Text><Text style={styles.number}>{equation.output}</Text></View>)}<View style={[styles.equation, styles.question]}><Text style={styles.number}>{puzzle.question}</Text><Text style={styles.arrow}>→</Text><TextInput value={answer} editable={!hasWon} onChangeText={setAnswer} keyboardType="number-pad" placeholder="?" placeholderTextColor="#A98FD0" style={styles.input} accessibilityLabel="Đáp án" /></View></View>
    <Text style={styles.hint}>Gợi ý: {puzzle.hint}</Text>{feedback ? <Text style={[styles.feedback, !hasWon && styles.feedbackWrong]}>{feedback}</Text> : null}{wrongAttempts > 0 && <Text style={styles.attempts}>Đã thử {wrongAttempts} lần</Text>}
    <View style={styles.actions}><Pressable style={styles.primaryButton} onPress={checkAnswer}><Text style={styles.primaryText}>Kiểm tra</Text></Pressable>{!dailyMode && <Pressable style={styles.secondaryButton} onPress={nextPuzzle}><Text style={styles.secondaryText}>Câu tiếp ›</Text></Pressable>}</View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1, padding: 22, backgroundColor: '#180B3D' }, header: { marginTop: 12 }, eyebrow: { color: '#FFCD63', fontSize: 12, fontWeight: '800', letterSpacing: 1.2 }, title: { color: '#FFF8EC', fontSize: 30, fontWeight: '800', marginTop: 8 }, subtitle: { color: '#D4C6EE', fontSize: 15, marginTop: 5 }, card: { marginTop: 30, borderRadius: 24, padding: 20, backgroundColor: '#2A145F', borderWidth: 1, borderColor: '#6842A9' }, equation: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18, paddingVertical: 13 }, question: { borderTopWidth: 1, borderTopColor: '#67469C', marginTop: 6, paddingTop: 22 }, number: { color: '#FFF8EC', fontSize: 28, minWidth: 58, textAlign: 'center', fontWeight: '800' }, arrow: { color: '#FFCD63', fontSize: 25, fontWeight: '700' }, input: { minWidth: 72, paddingVertical: 6, borderBottomWidth: 2, borderBottomColor: '#FFCD63', color: '#FFF8EC', textAlign: 'center', fontSize: 28, fontWeight: '800' }, hint: { color: '#D4C6EE', fontSize: 14, lineHeight: 21, marginTop: 24 }, feedback: { color: '#A8F2C4', fontSize: 16, fontWeight: '700', marginTop: 14 }, feedbackWrong: { color: '#F7A8C4' }, attempts: { color: '#C9B5EC', marginTop: 6 }, actions: { flexDirection: 'row', gap: 12, marginTop: 24 }, primaryButton: { flex: 1, alignItems: 'center', borderRadius: 15, paddingVertical: 14, backgroundColor: '#F3AF45' }, primaryText: { color: '#25103F', fontSize: 15, fontWeight: '800' }, secondaryButton: { flex: 1, alignItems: 'center', borderRadius: 15, paddingVertical: 14, backgroundColor: '#38206E', borderWidth: 1, borderColor: '#8E69BF' }, secondaryText: { color: '#F8EDFF', fontSize: 15, fontWeight: '800' } });
