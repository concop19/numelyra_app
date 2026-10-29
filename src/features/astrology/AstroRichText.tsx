import React, { useMemo } from 'react';
import {
  StyleSheet,
  Text,
  type StyleProp,
  type TextStyle,
} from 'react-native';

export type AstroTextTheme = 'dark' | 'light';

export type AstroTokenType =
  | 'plain'
  | 'planet'
  | 'zodiac'
  | 'house'
  | 'harmony'
  | 'tension'
  | 'conjunction'
  | 'mode'
  | 'degree'
  | 'bold';

export interface AstroToken {
  text: string;
  type: AstroTokenType;
}

const PLANETS = [
  'Sao Thiên Vương',
  'Sao Hải Vương',
  'Sao Diêm Vương',
  'Mặt Trời',
  'Mặt Trăng',
  'Sao Thủy',
  'Sao Kim',
  'Sao Hỏa',
  'Sao Mộc',
  'Sao Thổ',
  'Thiên Vương',
  'Hải Vương',
  'Diêm Vương',
  'Mercury',
  'Jupiter',
  'Neptune',
  'Saturn',
  'Uranus',
  'Venus',
  'Pluto',
  'Mars',
  'Moon',
  'Sun',
];

const ZODIACS = [
  'Bạch Dương',
  'Kim Ngưu',
  'Song Tử',
  'Cự Giải',
  'Sư Tử',
  'Xử Nữ',
  'Thiên Bình',
  'Bọ Cạp',
  'Nhân Mã',
  'Ma Kết',
  'Bảo Bình',
  'Song Ngư',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Gemini',
  'Cancer',
  'Virgo',
  'Libra',
  'Scorpio',
  'Pisces',
  'Taurus',
  'Aries',
  'Leo',
];

const ZODIAC_SYMBOLS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];

const HARMONY_WORDS = [
  'thuận dòng',
  'hài hòa',
  'góc tam hợp',
  'tam hợp',
  'góc lục hợp',
  'lục hợp',
  'hỗ trợ',
  'supportive',
  'harmony',
  'in flow',
  'sextile',
  'trine',
];

const TENSION_WORDS = [
  'thử thách',
  'ma sát',
  'áp lực',
  'xung đột',
  'góc vuông',
  'vuông góc',
  'góc đối đỉnh',
  'đối đỉnh',
  'cần điều chỉnh',
  'điều chỉnh',
  'challenging',
  'opposition',
  'friction',
  'tension',
  'square',
];

const CONJUNCTION_WORDS = [
  'khuếch đại',
  'góc trùng tụ',
  'trùng tụ',
  'góc hội tụ',
  'hội tụ',
  'conjunction',
  'converging',
];

const MODE_WORDS = [
  'bản mệnh',
  'quá cảnh',
  'lúc sinh',
  'hiện tại',
  'natal',
  'transit',
];

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildGroupPattern(words: string[]): string {
  const sorted = [...words].sort((a, b) => b.length - a.length);
  return `(?<=^|[^\\p{L}\\p{N}])(?:${sorted.map(escapeRegex).join('|')})(?=$|[^\\p{L}\\p{N}])`;
}

function buildTokenizerPattern(): RegExp {
  const parts: string[] = [
    // Markdown bold **...**
    '\\*\\*([^*]+)\\*\\*',
    // House patterns: Nhà 1..12 or House 1..12
    '(?<=^|[^\\p{L}\\p{N}])(?:Nhà|House)\\s+\\d+(?=$|[^\\p{L}\\p{N}])',
    // Degree / Orb patterns
    '(?<=^|[^\\p{L}\\p{N}])orb\\s+\\d+(?:\\.\\d+)?°',
    '\\d+(?:\\.\\d+)?°',
    // Planets
    buildGroupPattern(PLANETS),
    // Zodiacs
    buildGroupPattern(ZODIACS),
    // Zodiac symbols
    ...ZODIAC_SYMBOLS.map((s) => escapeRegex(s)),
    // Harmony words
    buildGroupPattern(HARMONY_WORDS),
    // Tension words
    buildGroupPattern(TENSION_WORDS),
    // Conjunction words
    buildGroupPattern(CONJUNCTION_WORDS),
    // Mode words
    buildGroupPattern(MODE_WORDS),
  ];

  return new RegExp(`(${parts.join('|')})`, 'giu');
}

const TOKENIZER_REGEX = buildTokenizerPattern();

const PLANET_LOOKUP = new Set(PLANETS.map((p) => p.toLocaleLowerCase('vi-VN')));
const ZODIAC_LOOKUP = new Set(ZODIACS.map((z) => z.toLocaleLowerCase('vi-VN')));
const SYMBOL_LOOKUP = new Set(ZODIAC_SYMBOLS);
const HARMONY_LOOKUP = new Set(HARMONY_WORDS.map((w) => w.toLocaleLowerCase('vi-VN')));
const TENSION_LOOKUP = new Set(TENSION_WORDS.map((w) => w.toLocaleLowerCase('vi-VN')));
const CONJUNCTION_LOOKUP = new Set(CONJUNCTION_WORDS.map((w) => w.toLocaleLowerCase('vi-VN')));
const MODE_LOOKUP = new Set(MODE_WORDS.map((m) => m.toLocaleLowerCase('vi-VN')));

export function tokenizeAstroText(content: string): AstroToken[] {
  if (!content) return [];

  const rawTokens = content.split(TOKENIZER_REGEX);
  const results: AstroToken[] = [];

  for (const raw of rawTokens) {
    if (!raw) continue;

    // Check markdown bold **text**
    if (raw.startsWith('**') && raw.endsWith('**') && raw.length > 4) {
      results.push({
        text: raw.slice(2, -2),
        type: 'bold',
      });
      continue;
    }

    const lower = raw.toLocaleLowerCase('vi-VN').trim();

    if (/^(?:Nhà|House)\s+\d+$/i.test(raw)) {
      results.push({ text: raw, type: 'house' });
    } else if (/^\d+(?:\.\d+)?°$/i.test(raw) || /^orb\s+\d+(?:\.\d+)?°$/i.test(raw)) {
      results.push({ text: raw, type: 'degree' });
    } else if (PLANET_LOOKUP.has(lower)) {
      results.push({ text: raw, type: 'planet' });
    } else if (ZODIAC_LOOKUP.has(lower) || SYMBOL_LOOKUP.has(raw)) {
      results.push({ text: raw, type: 'zodiac' });
    } else if (HARMONY_LOOKUP.has(lower)) {
      results.push({ text: raw, type: 'harmony' });
    } else if (TENSION_LOOKUP.has(lower)) {
      results.push({ text: raw, type: 'tension' });
    } else if (CONJUNCTION_LOOKUP.has(lower)) {
      results.push({ text: raw, type: 'conjunction' });
    } else if (MODE_LOOKUP.has(lower)) {
      results.push({ text: raw, type: 'mode' });
    } else {
      results.push({ text: raw, type: 'plain' });
    }
  }

  return results;
}

interface AstroRichTextProps {
  text?: string;
  children?: React.ReactNode;
  style?: StyleProp<TextStyle>;
  theme?: AstroTextTheme;
}

export function AstroRichText({
  text,
  children,
  style,
  theme = 'dark',
}: AstroRichTextProps) {
  const content = typeof text === 'string'
    ? text
    : typeof children === 'string'
      ? children
      : '';

  const tokens = useMemo(() => tokenizeAstroText(content), [content]);
  const palette = theme === 'light' ? lightStyles : darkStyles;

  if (tokens.length === 0) {
    return <Text style={style}>{children}</Text>;
  }

  return (
    <Text style={[palette.base, style]}>
      {tokens.map((token, index) => {
        if (token.type === 'plain') {
          return <React.Fragment key={`${index}-${token.text}`}>{token.text}</React.Fragment>;
        }

        const tokenStyle = palette[token.type];
        return (
          <Text key={`${index}-${token.text}`} style={[palette.highlightBase, tokenStyle]}>
            {token.text}
          </Text>
        );
      })}
    </Text>
  );
}

const darkStyles = StyleSheet.create({
  base: {
    color: '#D8D3EB',
  },
  highlightBase: {
    fontWeight: '800',
  },
  planet: {
    color: '#FFE2AB',
  },
  zodiac: {
    color: '#74E8FF',
  },
  house: {
    color: '#FBBF24',
  },
  harmony: {
    color: '#5EEAD4',
  },
  tension: {
    color: '#FB7185',
  },
  conjunction: {
    color: '#FDE047',
  },
  mode: {
    color: '#C4B5FD',
  },
  degree: {
    color: '#FDE68A',
    fontWeight: '700',
  },
  bold: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});

const lightStyles = StyleSheet.create({
  base: {
    color: '#31244C',
  },
  highlightBase: {
    fontWeight: '800',
  },
  planet: {
    color: '#8A4A00',
  },
  zodiac: {
    color: '#02677C',
  },
  house: {
    color: '#854D0E',
  },
  harmony: {
    color: '#0F766E',
  },
  tension: {
    color: '#BE123C',
  },
  conjunction: {
    color: '#854D0E',
  },
  mode: {
    color: '#6D28D9',
  },
  degree: {
    color: '#78350F',
    fontWeight: '700',
  },
  bold: {
    color: '#1C1335',
    fontWeight: '800',
  },
});
