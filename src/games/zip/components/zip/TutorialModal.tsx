import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { palette } from '../../game/colors';

type Step = {
  title: string;
  body: string;
  path: readonly [number, number][];
  checkpoints: readonly { pos: readonly [number, number]; value: number }[];
  hint?: readonly [number, number];
  trimmed?: readonly [number, number][];
  footer: string;
};

const STEPS: readonly Step[] = [
  {
    title: 'Bắt đầu từ số 1',
    body: 'Mọi ván Zip đều bắt đầu tại ô số 1. Chạm hoặc bắt đầu kéo từ ô này.',
    path: [[0, 0]],
    checkpoints: [
      { pos: [0, 0], value: 1 },
      { pos: [0, 2], value: 2 },
      { pos: [2, 2], value: 3 },
    ],
    hint: [0, 0],
    footer: 'Chỉ có ô số 1 mới có thể mở đầu đường đi.',
  },
  {
    title: 'Kéo nối các ô kề nhau',
    body: 'Giữ và kéo ngón tay qua các ô liền kề (ngang hoặc dọc). Không đi chéo.',
    path: [
      [0, 0],
      [0, 1],
      [0, 2],
      [1, 2],
    ],
    checkpoints: [
      { pos: [0, 0], value: 1 },
      { pos: [0, 2], value: 2 },
      { pos: [2, 2], value: 3 },
    ],
    footer: 'Đường đi phải liền mạch và phủ kín bàn chơi.',
  },
  {
    title: 'Chạm các số theo thứ tự',
    body: 'Đi qua số 1 rồi đến 2, rồi đến 3... và tiếp tục cho đến khi phủ kín toàn bộ ô.',
    path: [
      [0, 0],
      [0, 1],
      [0, 2],
      [1, 2],
      [2, 2],
      [2, 1],
    ],
    checkpoints: [
      { pos: [0, 0], value: 1 },
      { pos: [0, 2], value: 2 },
      { pos: [2, 2], value: 3 },
    ],
    footer: 'Chạm sai thứ tự số sẽ không thể đi tiếp.',
  },
  {
    title: 'Cho phép lùi bước',
    body: 'Kéo lùi lại ô trước đó trên đường đi để xóa đoạn sai. Cố gắng đạt 0 lần lùi!',
    path: [
      [0, 0],
      [0, 1],
      [1, 1],
    ],
    trimmed: [
      [1, 1],
      [1, 2],
      [0, 2],
    ],
    checkpoints: [
      { pos: [0, 0], value: 1 },
      { pos: [0, 2], value: 2 },
      { pos: [2, 2], value: 3 },
    ],
    footer: 'Đường đi hoàn hảo là hoàn thành với 0 lần lùi bước.',
  },
];

interface TutorialModalProps {
  readonly visible: boolean;
  readonly onClose: () => void;
}

export function TutorialModal({ visible, onClose }: TutorialModalProps) {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (visible) setStepIndex(0);
  }, [visible]);

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.kicker}>HƯỚNG DẪN CƠ BẢN</Text>
          <Text style={styles.title}>{step.title}</Text>
          <Text style={styles.body}>{step.body}</Text>

          <WalkthroughBoard step={step} />

          <View style={styles.progressRow}>
            {STEPS.map((_, index) => (
              <View
                key={`step-${index}`}
                style={[
                  styles.progressDot,
                  index === stepIndex && styles.progressDotActive,
                ]}
              />
            ))}
          </View>

          <Text style={styles.footer}>{step.footer}</Text>

          <View style={styles.actionRow}>
            {stepIndex > 0 ? (
              <Pressable
                onPress={() => setStepIndex((current) => current - 1)}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed && styles.secondaryButtonPressed,
                ]}
              >
                <Text style={styles.secondaryButtonText}>Quay lại</Text>
              </Pressable>
            ) : (
              <View style={styles.actionSpacer} />
            )}

            <Pressable
              onPress={() => {
                if (isLast) {
                  onClose();
                  return;
                }
                setStepIndex((current) => current + 1);
              }}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.primaryButtonPressed,
              ]}
            >
              <Text style={styles.primaryButtonText}>
                {isLast ? 'Bắt đầu chơi' : 'Tiếp theo ›'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function WalkthroughBoard({ step }: { step: Step }) {
  const size = 3;
  const cellSize = 64;
  const boardSize = size * cellSize;
  const thickness = 18;
  const half = thickness / 2;

  const pathCells = useMemo(
    () => new Set(step.path.map(([r, c]) => `${r},${c}`)),
    [step.path],
  );

  return (
    <View style={styles.demoWrap}>
      <View style={[styles.demoBoard, { width: boardSize, height: boardSize }]}>
        {Array.from({ length: size }, (_, r) => (
          <View key={`row-${r}`} style={styles.demoRow}>
            {Array.from({ length: size }, (_, c) => (
              <View
                key={`cell-${r}-${c}`}
                style={[
                  styles.demoCell,
                  {
                    width: cellSize,
                    height: cellSize,
                    backgroundColor:
                      step.hint && step.hint[0] === r && step.hint[1] === c
                        ? palette.cellHintWash
                        : palette.cellEmpty,
                  },
                ]}
              />
            ))}
          </View>
        ))}

        {step.trimmed?.map(([r, c], index) => (
          <View
            key={`trim-${r}-${c}-${index}`}
            style={[
              styles.trimmedDot,
              {
                left: c * cellSize + cellSize / 2 - half,
                top: r * cellSize + cellSize / 2 - half,
                width: thickness,
                height: thickness,
                borderRadius: half,
              },
            ]}
          />
        ))}

        {step.path.slice(1).map(([r, c], index) => {
          const [pr, pc] = step.path[index];
          const horizontal = pr === r;
          const left = horizontal
            ? Math.min(pc, c) * cellSize + cellSize / 2
            : c * cellSize + cellSize / 2 - half;
          const top = horizontal
            ? r * cellSize + cellSize / 2 - half
            : Math.min(pr, r) * cellSize + cellSize / 2;
          return (
            <View
              key={`seg-${pr}-${pc}-${r}-${c}`}
              style={[
                styles.pathPiece,
                {
                  left,
                  top,
                  width: horizontal ? cellSize : thickness,
                  height: horizontal ? thickness : cellSize,
                },
              ]}
            />
          );
        })}

        {step.path.map(([r, c], index) => (
          <View
            key={`dot-${r}-${c}-${index}`}
            style={[
              styles.pathPiece,
              {
                left: c * cellSize + cellSize / 2 - half,
                top: r * cellSize + cellSize / 2 - half,
                width: thickness,
                height: thickness,
                borderRadius: half,
              },
            ]}
          />
        ))}

        {step.checkpoints.map((checkpoint) => {
          const hit = pathCells.has(`${checkpoint.pos[0]},${checkpoint.pos[1]}`);
          return (
            <View
              key={`cp-${checkpoint.value}`}
              style={[
                styles.checkpoint,
                {
                  left: checkpoint.pos[1] * cellSize + 16,
                  top: checkpoint.pos[0] * cellSize + 16,
                  backgroundColor: hit ? palette.checkpointFillHit : palette.checkpointFill,
                },
              ]}
            >
              <Text style={styles.checkpointText}>{checkpoint.value}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.58)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: palette.surface,
    borderRadius: 22,
    padding: 24,
    borderWidth: 1,
    borderColor: palette.border,
  },
  kicker: {
    color: palette.accent,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    color: palette.text,
    fontSize: 28,
    fontWeight: '800',
    marginTop: 6,
  },
  body: {
    color: palette.textMuted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  demoWrap: {
    marginTop: 20,
    borderRadius: 18,
    backgroundColor: palette.background,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 18,
    alignItems: 'center',
  },
  demoBoard: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: palette.borderStrong,
    backgroundColor: palette.surface,
  },
  demoRow: {
    flexDirection: 'row',
  },
  demoCell: {
    borderWidth: 1,
    borderColor: palette.cellGrid,
  },
  pathPiece: {
    position: 'absolute',
    backgroundColor: palette.accent,
  },
  trimmedDot: {
    position: 'absolute',
    backgroundColor: palette.accentEdge,
    opacity: 0.35,
  },
  checkpoint: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkpointText: {
    color: palette.checkpointText,
    fontSize: 14,
    fontWeight: '800',
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 18,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.borderStrong,
  },
  progressDotActive: {
    width: 24,
    backgroundColor: palette.accent,
  },
  footer: {
    color: palette.text,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 14,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 22,
  },
  actionSpacer: {
    flex: 1,
  },
  primaryButton: {
    flex: 1.25,
    backgroundColor: palette.accent,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonPressed: {
    opacity: 0.85,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: palette.surface,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.borderStrong,
  },
  secondaryButtonPressed: {
    backgroundColor: palette.accentSoft,
  },
  secondaryButtonText: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '600',
  },
});
