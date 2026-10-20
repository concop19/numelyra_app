import {
  mdiCat,
  mdiCrownOutline,
  mdiFlowerOutline,
  mdiHeartOutline,
  mdiHomeOutline,
  mdiPigVariantOutline,
  mdiPineTreeVariantOutline,
  mdiStarOutline,
} from '@mdi/js';

import type { AstrologySymbolPreset } from './types';

function mdiSvg(pathData: string): string {
  // MDI glyphs are filled paths, so SVG implicitly closes every subpath even
  // when its data omits Z. The constellation renderer draws strokes instead;
  // make that implicit closure explicit to preserve the original silhouette.
  const closedPathData = (pathData.match(/[Mm][^Mm]*/g) ?? [pathData])
    .map((subpath) => /[zZ]\s*$/.test(subpath) ? subpath : `${subpath}Z`)
    .join(' ');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="${closedPathData}" /></svg>`;
}

// Versioned filename intentionally busts Metro/device image caches when the
// generated wallpaper art changes without changing its logical role.
const galaxyBackground = require('../../../assets/giao_dien/giaodien1/constellation/galaxy-background-v2.png');
const auroraOverlay = require('../../../assets/giao_dien/giaodien1/constellation/aurora-overlay.png');

export const DEFAULT_ASTROLOGY_SYMBOL_ID = 'heart';

const sharedAssets = {
  backgroundSource: galaxyBackground,
  auroraSource: auroraOverlay,
  sampling: {
    samplesPerPath: 42,
    straightToleranceDeg: 16,
    filterPasses: 5,
  },
};

export const ASTROLOGY_SYMBOLS: Record<string, AstrologySymbolPreset> = {
  heart: {
    ...sharedAssets,
    id: 'heart',
    svgXml: mdiSvg(mdiHeartOutline),
    title: 'Trái tim',
  },
  home: {
    ...sharedAssets,
    id: 'home',
    svgXml: mdiSvg(mdiHomeOutline),
    title: 'Ngôi nhà',
  },
  pig: {
    ...sharedAssets,
    id: 'pig',
    svgXml: mdiSvg(mdiPigVariantOutline),
    title: 'Heo may mắn',
  },
  cat: {
    ...sharedAssets,
    id: 'cat',
    svgXml: mdiSvg(mdiCat),
    title: 'Mèo tinh tú',
  },
  flower: {
    ...sharedAssets,
    id: 'flower',
    svgXml: mdiSvg(mdiFlowerOutline),
    title: 'Đóa hoa',
  },
  crown: {
    ...sharedAssets,
    id: 'crown',
    svgXml: mdiSvg(mdiCrownOutline),
    title: 'Vương miện',
  },
  star: {
    ...sharedAssets,
    id: 'star',
    svgXml: mdiSvg(mdiStarOutline),
    title: 'Ngôi sao',
  },
  pine: {
    ...sharedAssets,
    id: 'pine',
    svgXml: mdiSvg(mdiPineTreeVariantOutline),
    title: 'Cây thông',
  },
};

export const ASTROLOGY_SYMBOL_LIST = Object.values(ASTROLOGY_SYMBOLS);

function hashText(value: string): number {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

/**
 * Chọn một mẫu ổn định theo ngày trên thiết bị. Cùng một ngày luôn cho cùng
 * kết quả; ngày mới sẽ chuyển sang mẫu kế tiếp trong một thứ tự giả ngẫu nhiên.
 */
export function getDailyAstrologySymbolId(date = new Date(), profileKey = 'guest'): string {
  const localDayNumber = Math.floor(Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  ) / 86_400_000);
  const normalizedProfileKey = profileKey.trim().toLocaleLowerCase('vi-VN') || 'guest';
  const profileOffset = hashText(normalizedProfileKey);
  const mixedSeed = (profileOffset + Math.imul(localDayNumber, 2_654_435_761)) >>> 0;
  return ASTROLOGY_SYMBOL_LIST[mixedSeed % ASTROLOGY_SYMBOL_LIST.length].id;
}

export function getAstrologySymbol(id?: string): AstrologySymbolPreset {
  return ASTROLOGY_SYMBOLS[id ?? DEFAULT_ASTROLOGY_SYMBOL_ID]
    ?? ASTROLOGY_SYMBOLS[DEFAULT_ASTROLOGY_SYMBOL_ID];
}
