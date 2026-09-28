import React, { useMemo, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { buildCheckpointMap, buildWallSet, canExtendPath, indexOnPath, isWinningPath, posKey } from './game/logic';
import { PUZZLES } from './game/puzzles';

export default function ZipGameScreen() {
  const puzzle = PUZZLES[0];
  const [path, setPath] = useState<number[][]>([]);
  const [message, setMessage] = useState('Bắt đầu tại ô số 1.');
  const walls = useMemo(() => buildWallSet(puzzle.walls), [puzzle]);
  const checkpoints = useMemo(() => buildCheckpointMap(puzzle), [puzzle]);

  const chooseCell = (row: number, column: number) => {
    const next = [row, column];
    if (path.length === 0) {
      if (checkpoints.get(posKey(row, column)) !== 1) {
        setMessage('Hãy bắt đầu tại checkpoint số 1.');
        return;
      }
      setPath([next]);
      setMessage('Tốt! Đi qua các ô kề nhau.');
      return;
    }

    const foundAt = indexOnPath(path as [number, number][], next as [number, number]);
    if (foundAt >= 0) {
      setPath(path.slice(0, foundAt + 1));
      setMessage('Đã quay lại đường đi trước đó.');
      return;
    }

    const head = path[path.length - 1] as [number, number];
    const nextExpected = (() => {
      let highest = 0;
      for (const cell of path) highest = Math.max(highest, checkpoints.get(posKey(cell[0], cell[1])) ?? 0);
      return highest + 1;
    })();
    const legal = canExtendPath({
      size: puzzle.size,
      head,
      next: next as [number, number],
      visited: new Set(path.map((cell) => posKey(cell[0], cell[1]))),
      wallSet: walls,
      checkpoints,
      nextExpected,
    });
    if (!legal) {
      setMessage('Nước đi không hợp lệ. Chỉ đi ngang/dọc và đúng thứ tự checkpoint.');
      return;
    }
    const nextPath = [...path, next];
    setPath(nextPath);
    setMessage(isWinningPath(puzzle, nextPath as [number, number][]) ? 'Hoàn thành Zip! 🎉' : 'Tiếp tục nào.');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.eyebrow}>ZIP · {puzzle.name}</Text>
      <Text style={styles.title}>Nối mọi ô theo đường liên tục</Text>
      <Text style={styles.message}>{message}</Text>
      <View style={styles.board}>
        {Array.from({ length: puzzle.size }, (_, row) => (
          <View key={row} style={styles.row}>
            {Array.from({ length: puzzle.size }, (_, column) => {
              const key = posKey(row, column);
              const checkpoint = checkpoints.get(key);
              const pathIndex = indexOnPath(path as [number, number][], [row, column]);
              return (
                <Pressable key={key} onPress={() => chooseCell(row, column)} style={[styles.cell, pathIndex >= 0 && styles.pathCell, checkpoint !== undefined && styles.checkpointCell]}>
                  <Text style={[styles.cellText, pathIndex >= 0 && styles.pathText]}>{checkpoint ?? (pathIndex >= 0 ? pathIndex + 1 : '')}</Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
      <Pressable onPress={() => { setPath([]); setMessage('Bắt đầu tại ô số 1.'); }} style={styles.reset}>
        <Text style={styles.resetText}>↻ Chơi lại</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, padding: 20, backgroundColor: '#10273C' },
  eyebrow: { color: '#8DE6D4', fontWeight: '800', letterSpacing: 1.2, fontSize: 12, marginTop: 10 },
  title: { color: '#F2FBFF', fontSize: 25, fontWeight: '800', marginTop: 8 },
  message: { color: '#C4E7F0', minHeight: 42, fontSize: 14, lineHeight: 20, marginTop: 10 },
  board: { alignSelf: 'center', width: '100%', maxWidth: 390, aspectRatio: 1, borderRadius: 14, overflow: 'hidden', borderWidth: 2, borderColor: '#70D3C4' },
  row: { flex: 1, flexDirection: 'row' },
  cell: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#19415B', borderWidth: 0.5, borderColor: '#39738A' },
  pathCell: { backgroundColor: '#8DE6D4' },
  checkpointCell: { borderWidth: 2, borderColor: '#FFCF67' },
  cellText: { color: '#F7FCFF', fontWeight: '800', fontSize: 16 },
  pathText: { color: '#123143' },
  reset: { alignSelf: 'center', marginTop: 22, paddingHorizontal: 24, paddingVertical: 13, borderRadius: 14, backgroundColor: '#24677A' },
  resetText: { color: '#F2FBFF', fontWeight: '800' },
});
