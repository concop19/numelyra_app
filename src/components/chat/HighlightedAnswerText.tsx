import React, { type ReactNode } from 'react';
import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';

interface TextRange {
  start: number;
  end: number;
}

interface Props {
  text: string;
  style?: StyleProp<TextStyle>;
  emphasisStyle?: StyleProp<TextStyle>;
  children?: ReactNode;
}

const INLINE_HIGHLIGHT_PATTERNS = [
  /"[^"\n]+"/g,
  /\b\d+(?:[.,]\d+)?%/g,
  /\bPhương\s+Án\s+[A-Z]\b/gi,
  /(?:Đường\s+Đời|Năm\s+Cá\s+Nhân)(?:\s+(?:số\s+)?\d+|\s*\(\d+\))/gi,
  /Số\s+(?:Đường\s+Đời|Sứ\s+Mệnh|Linh\s+Hồn|Ngày\s+Sinh)/gi,
];

const addPatternRanges = (text: string, pattern: RegExp, ranges: TextRange[]) => {
  pattern.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    ranges.push({ start: match.index, end: match.index + match[0].length });
  }
};

const getEmphasisRanges = (text: string): TextRange[] => {
  const ranges: TextRange[] = [];
  let lineStart = 0;

  for (const line of text.split('\n')) {
    const trimmedStartLength = line.length - line.trimStart().length;
    const trimmedLine = line.trimStart();

    if (trimmedLine.startsWith('✦')) {
      ranges.push({ start: lineStart + trimmedStartLength, end: lineStart + line.length });
    }

    const bulletLabel = /^(\s*•\s*)([^:\n]+:)/.exec(line);
    if (bulletLabel) {
      const labelStart = lineStart + bulletLabel[1].length;
      ranges.push({ start: labelStart, end: labelStart + bulletLabel[2].length });
    }

    lineStart += line.length + 1;
  }

  INLINE_HIGHLIGHT_PATTERNS.forEach(pattern => addPatternRanges(text, pattern, ranges));

  return ranges
    .sort((a, b) => a.start - b.start || b.end - a.end)
    .reduce<TextRange[]>((merged, range) => {
      const previous = merged[merged.length - 1];
      if (previous && range.start <= previous.end) {
        previous.end = Math.max(previous.end, range.end);
      } else {
        merged.push({ ...range });
      }
      return merged;
    }, []);
};

/** Preserves the original message while making its scannable cues stand out. */
export const HighlightedAnswerText: React.FC<Props> = ({
  text,
  style,
  emphasisStyle,
  children,
}) => {
  const ranges = getEmphasisRanges(text);
  const fragments: ReactNode[] = [];
  let cursor = 0;

  ranges.forEach((range, index) => {
    if (cursor < range.start) {
      fragments.push(text.slice(cursor, range.start));
    }

    fragments.push(
      <Text key={`emphasis-${range.start}-${index}`} style={[styles.emphasis, emphasisStyle]}>
        {text.slice(range.start, range.end)}
      </Text>
    );
    cursor = range.end;
  });

  if (cursor < text.length) {
    fragments.push(text.slice(cursor));
  }

  return (
    <Text style={style}>
      {fragments}
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  emphasis: {
    fontWeight: '800',
  },
});

export default HighlightedAnswerText;
