import React, { useMemo, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { PUZZLES } from './src/data/puzzles';

export default function MindRulesGame() {
  const [level, setLevel] = useState(0);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const puzzle = PUZZLES[level];
  const progress = useMemo(() => `${level + 1}/${PUZZLES.length}`, [level]);

  const checkAnswer = () => {
    if (Number(answer) === puzzle.answer) {
      setFeedback('Chính xác! ✨');
    } else {
      setFeedback('Chưa đúng, thử lại nhé.');
    }
  };

  const nextPuzzle = () => {
    setLevel((value) => (value + 1) % PUZZLES.length);
    setAnswer('');
    setFeedback('');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>MIND RULES · {progress}</Text>
        <Text style={styles.title}>{puzzle.title}</Text>
        <Text style={styles.subtitle}>Tìm quy luật biến đổi của các con số.</Text>
      </View>

      <View style={styles.card}>
        {puzzle.equations.map((equation) => (
          <View key={equation.input} style={styles.equation}>
            <Text style={styles.number}>{equation.input}</Text>
            <Text style={styles.arrow}>→</Text>
            <Text style={styles.number}>{equation.output}</Text>
          </View>
        ))}
        <View style={[styles.equation, styles.question]}>
          <Text style={styles.number}>{puzzle.question}</Text>
          <Text style={styles.arrow}>→</Text>
          <TextInput
            value={answer}
            onChangeText={setAnswer}
            keyboardType="number-pad"
            placeholder="?"
            placeholderTextColor="#A98FD0"
            style={styles.input}
            accessibilityLabel="Đáp án"
          />
        </View>
      </View>

      <Text style={styles.hint}>Gợi ý: {puzzle.hint}</Text>
      {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}

      <View style={styles.actions}>
        <Pressable style={styles.primaryButton} onPress={checkAnswer}>
          <Text style={styles.primaryText}>Kiểm tra</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={nextPuzzle}>
          <Text style={styles.secondaryText}>Câu tiếp ›</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, padding: 22, backgroundColor: '#180B3D' },
  header: { marginTop: 12 },
  eyebrow: { color: '#FFCD63', fontSize: 12, fontWeight: '800', letterSpacing: 1.2 },
  title: { color: '#FFF8EC', fontSize: 30, fontWeight: '800', marginTop: 8 },
  subtitle: { color: '#D4C6EE', fontSize: 15, marginTop: 5 },
  card: { marginTop: 30, borderRadius: 24, padding: 20, backgroundColor: '#2A145F', borderWidth: 1, borderColor: '#6842A9' },
  equation: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18, paddingVertical: 13 },
  question: { borderTopWidth: 1, borderTopColor: '#67469C', marginTop: 6, paddingTop: 22 },
  number: { color: '#FFF8EC', fontSize: 28, minWidth: 58, textAlign: 'center', fontWeight: '800' },
  arrow: { color: '#FFCD63', fontSize: 25, fontWeight: '700' },
  input: { minWidth: 72, paddingVertical: 6, borderBottomWidth: 2, borderBottomColor: '#FFCD63', color: '#FFF8EC', textAlign: 'center', fontSize: 28, fontWeight: '800' },
  hint: { color: '#D4C6EE', fontSize: 14, lineHeight: 21, marginTop: 24 },
  feedback: { color: '#A8F2C4', fontSize: 16, fontWeight: '700', marginTop: 14 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  primaryButton: { flex: 1, alignItems: 'center', borderRadius: 15, paddingVertical: 14, backgroundColor: '#F3AF45' },
  primaryText: { color: '#25103F', fontSize: 15, fontWeight: '800' },
  secondaryButton: { flex: 1, alignItems: 'center', borderRadius: 15, paddingVertical: 14, backgroundColor: '#38206E', borderWidth: 1, borderColor: '#8E69BF' },
  secondaryText: { color: '#F8EDFF', fontSize: 15, fontWeight: '800' },
});
