import React, { useMemo, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { buildCheckpointMap, buildWallSet, canExtendPath, indexOnPath, isWinningPath, posKey } from './game/logic';
import { getDailyPuzzle, PUZZLES } from './game/puzzles';
import type { Puzzle } from './game/types';
import { advanceDailyStreak, recordCompletion } from './game/storage';

type Props = { dailyMode?: boolean; onDailyComplete?: () => void };

export default function ZipGameScreen({ dailyMode = false, onDailyComplete }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(dailyMode ? getDailyPuzzle().id : null);
  const dailyPuzzle = useMemo(() => getDailyPuzzle(), []);
  const puzzle = selectedId === dailyPuzzle.id ? dailyPuzzle : PUZZLES.find((item) => item.id === selectedId);
  if (!puzzle) return <ZipLibrary onOpen={(id) => setSelectedId(id)} dailyPuzzle={dailyPuzzle} />;
  return <ZipBoard puzzle={puzzle} isDaily={puzzle.id === dailyPuzzle.id} onBack={() => setSelectedId(null)} onDailyComplete={onDailyComplete} />;
}

function ZipLibrary({ dailyPuzzle, onOpen }: { dailyPuzzle: Puzzle; onOpen: (id: string) => void }) {
  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.library}><Text style={styles.eyebrow}>ZIP PUZZLES</Text><Text style={styles.title}>Chọn đường đi</Text><Text style={styles.message}>24 màn luyện tập và một thử thách mới mỗi ngày.</Text>
    <Pressable style={styles.dailyCard} onPress={() => onOpen(dailyPuzzle.id)}><Text style={styles.dailyKicker}>✦ DAILY</Text><Text style={styles.dailyTitle}>Daily Puzzle</Text><Text style={styles.dailyText}>{dailyPuzzle.size}×{dailyPuzzle.size} · {dailyPuzzle.difficulty}</Text></Pressable>
    <View style={styles.puzzleList}>{PUZZLES.map((item, index) => <Pressable key={item.id} style={styles.puzzleRow} onPress={() => onOpen(item.id)}><Text style={styles.puzzleNumber}>{String(index + 1).padStart(2, '0')}</Text><View style={styles.puzzleCopy}><Text style={styles.puzzleName}>{item.name}</Text><Text style={styles.puzzleMeta}>{item.size}×{item.size} · {item.checkpoints.length} checkpoints</Text></View><Text style={styles.difficulty}>{item.difficulty}</Text></Pressable>)}</View>
  </ScrollView></SafeAreaView>;
}

function ZipBoard({ puzzle, isDaily, onBack, onDailyComplete }: { puzzle: Puzzle; isDaily: boolean; onBack: () => void; onDailyComplete?: () => void }) {
  const [path, setPath] = useState<[number, number][]>([]); const [moves, setMoves] = useState(0); const [message, setMessage] = useState('Bắt đầu tại checkpoint số 1.'); const [won, setWon] = useState(false);
  const walls = useMemo(() => buildWallSet(puzzle.walls), [puzzle]); const checkpoints = useMemo(() => buildCheckpointMap(puzzle), [puzzle]);
  const chooseCell = async (row: number, column: number) => {
    if (won) return; const next: [number, number] = [row, column];
    if (path.length === 0) { if (checkpoints.get(posKey(row, column)) !== 1) return setMessage('Hãy bắt đầu tại checkpoint số 1.'); setPath([next]); setMoves(1); return setMessage('Tốt! Đi qua các ô kề nhau.'); }
    const foundAt = indexOnPath(path, next); if (foundAt >= 0) { setPath(path.slice(0, foundAt + 1)); setMoves((value) => value + 1); return setMessage('Đã quay lại đường đi trước đó.'); }
    const head = path[path.length - 1]; let highest = 0; for (const cell of path) highest = Math.max(highest, checkpoints.get(posKey(cell[0], cell[1])) ?? 0);
    if (!canExtendPath({ size: puzzle.size, head, next, visited: new Set(path.map((cell) => posKey(cell[0], cell[1]))), wallSet: walls, checkpoints, nextExpected: highest + 1 })) return setMessage('Nước đi không hợp lệ. Chỉ đi ngang/dọc và đúng checkpoint.');
    const nextPath = [...path, next]; setPath(nextPath); setMoves((value) => value + 1);
    if (isWinningPath(puzzle, nextPath)) { setWon(true); setMessage('Hoàn thành Zip! 🎉'); await recordCompletion({ puzzleId: puzzle.id, timeSec: 0, moves: moves + 1, backtracks: 0 }); if (isDaily) { await advanceDailyStreak({ todayKey: puzzle.id.replace('daily-', '') }); onDailyComplete?.(); } } else setMessage('Tiếp tục nào.');
  };
  return <SafeAreaView style={styles.safe}><View style={styles.gameHeader}><Pressable onPress={onBack}><Text style={styles.link}>‹ Danh sách</Text></Pressable><Text style={styles.eyebrow}>{isDaily ? 'ZIP DAILY' : `ZIP · ${puzzle.difficulty.toUpperCase()}`}</Text><Text style={styles.title}>{puzzle.name}</Text><Text style={styles.message}>{message}</Text></View><View style={styles.board}>{Array.from({ length: puzzle.size }, (_, row) => <View key={row} style={styles.row}>{Array.from({ length: puzzle.size }, (_, column) => { const key = posKey(row, column); const checkpoint = checkpoints.get(key); const pathIndex = indexOnPath(path, [row, column]); return <Pressable key={key} onPress={() => void chooseCell(row, column)} style={[styles.cell, pathIndex >= 0 && styles.pathCell, checkpoint !== undefined && styles.checkpointCell]}><Text style={[styles.cellText, pathIndex >= 0 && styles.pathText]}>{checkpoint ?? ''}</Text></Pressable>; })}</View>)}</View><View style={styles.actions}><Text style={styles.moves}>Nước đi: {moves}</Text><Pressable onPress={() => { setPath([]); setMoves(0); setWon(false); setMessage('Bắt đầu tại checkpoint số 1.'); }} style={styles.reset}><Text style={styles.resetText}>↻ Chơi lại</Text></Pressable></View></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1, padding: 20, backgroundColor: '#10273C' }, library: { paddingBottom: 28 }, eyebrow: { color: '#8DE6D4', fontWeight: '800', letterSpacing: 1.2, fontSize: 12, marginTop: 10 }, title: { color: '#F2FBFF', fontSize: 25, fontWeight: '800', marginTop: 8 }, message: { color: '#C4E7F0', minHeight: 42, fontSize: 14, lineHeight: 20, marginTop: 10 }, dailyCard: { marginTop: 16, padding: 17, borderRadius: 16, backgroundColor: '#28637A', borderWidth: 1, borderColor: '#8DE6D4' }, dailyKicker: { color: '#D8FFEE', fontWeight: '900', fontSize: 11 }, dailyTitle: { color: '#fff', fontSize: 20, fontWeight: '900', marginTop: 4 }, dailyText: { color: '#D8FFEE', marginTop: 3 }, puzzleList: { gap: 9, marginTop: 16 }, puzzleRow: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 13, borderRadius: 14, backgroundColor: '#19415B', borderWidth: 1, borderColor: '#39738A' }, puzzleNumber: { color: '#8DE6D4', fontWeight: '900', width: 28 }, puzzleCopy: { flex: 1 }, puzzleName: { color: '#F7FCFF', fontWeight: '800', fontSize: 15 }, puzzleMeta: { color: '#B7DCE6', fontSize: 12, marginTop: 3 }, difficulty: { color: '#FFCF67', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' }, gameHeader: { marginTop: 4 }, link: { color: '#8DE6D4', fontWeight: '800' }, board: { alignSelf: 'center', width: '100%', maxWidth: 390, aspectRatio: 1, borderRadius: 14, overflow: 'hidden', borderWidth: 2, borderColor: '#70D3C4', marginTop: 12 }, row: { flex: 1, flexDirection: 'row' }, cell: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#19415B', borderWidth: 0.5, borderColor: '#39738A' }, pathCell: { backgroundColor: '#8DE6D4' }, checkpointCell: { borderWidth: 2, borderColor: '#FFCF67' }, cellText: { color: '#F7FCFF', fontWeight: '800', fontSize: 16 }, pathText: { color: '#123143' }, actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18 }, moves: { color: '#C4E7F0' }, reset: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12, backgroundColor: '#24677A' }, resetText: { color: '#F2FBFF', fontWeight: '800' } });
