import type { PlanetId, ZodiacId } from './astrologyPresentation';

export type AstrologyBackgroundVariant = 'today' | 'natal' | 'detail' | 'planetDetail';
export type AstrologyUiIconId =
  | 'calendar'
  | 'clock'
  | 'explore'
  | 'journal'
  | 'location'
  | 'profile'
  | 'share'
  | 'today';
export type AstrologyDecorationId =
  | 'crescentMoon'
  | 'lightRays'
  | 'nebulaSwirl'
  | 'orbitRing'
  | 'shootingStar'
  | 'sparkle4'
  | 'sparkle6'
  | 'starDust';

export const ASTROLOGY_BACKGROUNDS = {
  today: require('../../../assets/giao_dien/giaodien1/astrology/background/ChatGPT Image Oct 11, 2026, 08_47_57 PM-3.webp'),
  natal: require('../../../assets/giao_dien/giaodien1/astrology/background/ChatGPT Image Oct 11, 2026, 08_47_56 PM-2.webp'),
  detail: require('../../../assets/giao_dien/giaodien1/astrology/background/ChatGPT Image Oct 11, 2026, 08_47_55 PM-1.webp'),
  planetDetail: require('../../../assets/giao_dien/giaodien1/astrology/background/planet-detail-milky-way-v2.webp'),
} satisfies Record<AstrologyBackgroundVariant, number>;

export const PLANET_PNG = {
  Sun: require('../../../assets/giao_dien/giaodien1/astrology/plannet/ChatGPT Image Oct 11, 2026, 08_47_26 PM-1.webp'),
  Moon: require('../../../assets/giao_dien/giaodien1/astrology/plannet/ChatGPT Image Oct 11, 2026, 08_47_28 PM-2.webp'),
  Mercury: require('../../../assets/giao_dien/giaodien1/astrology/plannet/ChatGPT Image Oct 11, 2026, 08_47_29 PM-3.webp'),
  Venus: require('../../../assets/giao_dien/giaodien1/astrology/plannet/ChatGPT Image Oct 11, 2026, 08_47_30 PM-4.webp'),
  Mars: require('../../../assets/giao_dien/giaodien1/astrology/plannet/ChatGPT Image Oct 11, 2026, 08_47_32 PM-5.webp'),
  Jupiter: require('../../../assets/giao_dien/giaodien1/astrology/plannet/ChatGPT Image Oct 11, 2026, 08_47_12 PM-1.webp'),
  Saturn: require('../../../assets/giao_dien/giaodien1/astrology/plannet/ChatGPT Image Oct 11, 2026, 08_47_14 PM-2.webp'),
  Uranus: require('../../../assets/giao_dien/giaodien1/astrology/plannet/ChatGPT Image Oct 11, 2026, 08_47_15 PM-3.webp'),
  Neptune: require('../../../assets/giao_dien/giaodien1/astrology/plannet/ChatGPT Image Oct 11, 2026, 08_47_16 PM-4.webp'),
  Pluto: require('../../../assets/giao_dien/giaodien1/astrology/plannet/ChatGPT Image Oct 11, 2026, 08_47_17 PM-5.webp'),
} satisfies Record<PlanetId, number>;

export const PLANET_SVG = {
  Sun: require('../../../assets/giao_dien/giaodien1/astrology/svg/planet/planet_sun.svg'),
  Moon: require('../../../assets/giao_dien/giaodien1/astrology/svg/planet/planet_moon.svg'),
  Mercury: require('../../../assets/giao_dien/giaodien1/astrology/svg/planet/planet_mercury.svg'),
  Venus: require('../../../assets/giao_dien/giaodien1/astrology/svg/planet/planet_venus.svg'),
  Mars: require('../../../assets/giao_dien/giaodien1/astrology/svg/planet/planet_mars.svg'),
  Jupiter: require('../../../assets/giao_dien/giaodien1/astrology/svg/planet/planet_jupiter.svg'),
  Saturn: require('../../../assets/giao_dien/giaodien1/astrology/svg/planet/planet_saturn.svg'),
  Uranus: require('../../../assets/giao_dien/giaodien1/astrology/svg/planet/planet_uranus.svg'),
  Neptune: require('../../../assets/giao_dien/giaodien1/astrology/svg/planet/planet_neptune.svg'),
  Pluto: require('../../../assets/giao_dien/giaodien1/astrology/svg/planet/planet_pluto.svg'),
} satisfies Record<PlanetId, number>;

export const ZODIAC_PNG = {
  Aries: require('../../../assets/giao_dien/giaodien1/astrology/zodiac/zodiac_aries.webp'),
  Taurus: require('../../../assets/giao_dien/giaodien1/astrology/zodiac/zodiac_taurus.webp'),
  Gemini: require('../../../assets/giao_dien/giaodien1/astrology/zodiac/zodiac_gemini.webp'),
  Cancer: require('../../../assets/giao_dien/giaodien1/astrology/zodiac/zodiac_cancer.webp'),
  Leo: require('../../../assets/giao_dien/giaodien1/astrology/zodiac/zodiac_leo.webp'),
  Virgo: require('../../../assets/giao_dien/giaodien1/astrology/zodiac/zodiac_virgo.webp'),
  Libra: require('../../../assets/giao_dien/giaodien1/astrology/zodiac/zodiac_libra.webp'),
  Scorpio: require('../../../assets/giao_dien/giaodien1/astrology/zodiac/zodiac_scorpio.webp'),
  Sagittarius: require('../../../assets/giao_dien/giaodien1/astrology/zodiac/zodiac_sagittarius.webp'),
  Capricorn: require('../../../assets/giao_dien/giaodien1/astrology/zodiac/zodiac_capricorn.webp'),
  Aquarius: require('../../../assets/giao_dien/giaodien1/astrology/zodiac/zodiac_aquarius.webp'),
  Pisces: require('../../../assets/giao_dien/giaodien1/astrology/zodiac/zodiac_pisces.webp'),
} satisfies Record<ZodiacId, number>;

export const CONSTELLATION_SVG = {
  Aries: require('../../../assets/giao_dien/giaodien1/astrology/svg/constellation/constellation_aries.svg'),
  Taurus: require('../../../assets/giao_dien/giaodien1/astrology/svg/constellation/constellation_taurus.svg'),
  Gemini: require('../../../assets/giao_dien/giaodien1/astrology/svg/constellation/constellation_gemini.svg'),
  Cancer: require('../../../assets/giao_dien/giaodien1/astrology/svg/constellation/constellation_cancer.svg'),
  Leo: require('../../../assets/giao_dien/giaodien1/astrology/svg/constellation/constellation_leo.svg'),
  Virgo: require('../../../assets/giao_dien/giaodien1/astrology/svg/constellation/constellation_virgo.svg'),
  Libra: require('../../../assets/giao_dien/giaodien1/astrology/svg/constellation/constellation_libra.svg'),
  Scorpio: require('../../../assets/giao_dien/giaodien1/astrology/svg/constellation/constellation_scorpio.svg'),
  Sagittarius: require('../../../assets/giao_dien/giaodien1/astrology/svg/constellation/constellation_sagittarius.svg'),
  Capricorn: require('../../../assets/giao_dien/giaodien1/astrology/svg/constellation/constellation_capricorn.svg'),
  Aquarius: require('../../../assets/giao_dien/giaodien1/astrology/svg/constellation/constellation_aquarius.svg'),
  Pisces: require('../../../assets/giao_dien/giaodien1/astrology/svg/constellation/constellation_pisces.svg'),
} satisfies Record<ZodiacId, number>;

export const ASTROLOGY_UI_ICONS = {
  calendar: require('../../../assets/giao_dien/giaodien1/astrology/svg/ui/ui_calendar.svg'),
  clock: require('../../../assets/giao_dien/giaodien1/astrology/svg/ui/ui_clock.svg'),
  explore: require('../../../assets/giao_dien/giaodien1/astrology/svg/ui/ui_explore.svg'),
  journal: require('../../../assets/giao_dien/giaodien1/astrology/svg/ui/ui_journal.svg'),
  location: require('../../../assets/giao_dien/giaodien1/astrology/svg/ui/ui_location.svg'),
  profile: require('../../../assets/giao_dien/giaodien1/astrology/svg/ui/ui_profile.svg'),
  share: require('../../../assets/giao_dien/giaodien1/astrology/svg/ui/ui_share.svg'),
  today: require('../../../assets/giao_dien/giaodien1/astrology/svg/ui/ui_today.svg'),
} satisfies Record<AstrologyUiIconId, number>;

export const ASTROLOGY_DECORATIONS = {
  crescentMoon: require('../../../assets/giao_dien/giaodien1/astrology/svg/decorations/crescent_moon.svg'),
  lightRays: require('../../../assets/giao_dien/giaodien1/astrology/svg/decorations/light_rays.svg'),
  nebulaSwirl: require('../../../assets/giao_dien/giaodien1/astrology/svg/decorations/nebula_swirl.svg'),
  orbitRing: require('../../../assets/giao_dien/giaodien1/astrology/svg/decorations/orbit_ring.svg'),
  shootingStar: require('../../../assets/giao_dien/giaodien1/astrology/svg/decorations/shooting_star.svg'),
  sparkle4: require('../../../assets/giao_dien/giaodien1/astrology/svg/decorations/sparkle_4point.svg'),
  sparkle6: require('../../../assets/giao_dien/giaodien1/astrology/svg/decorations/sparkle_6point.svg'),
  starDust: require('../../../assets/giao_dien/giaodien1/astrology/svg/decorations/star_dust.svg'),
} satisfies Record<AstrologyDecorationId, number>;

export const ASTROLOGY_ARTWORK = {
  hero: ASTROLOGY_BACKGROUNDS.today,
  detail: ASTROLOGY_BACKGROUNDS.detail,
  generic: ASTROLOGY_BACKGROUNDS.today,
  venus: PLANET_PNG.Venus,
  saturn: PLANET_PNG.Saturn,
};

export const ASTROLOGY_TODAY_ARTWORK = {
  catSleeping: require('../../../assets/giao_dien/giaodien1/astrology/today/cat_sleeping.webp'),
  wavesWatercolor: require('../../../assets/giao_dien/giaodien1/astrology/today/waves_watercolor.webp'),
  heartFlower: require('../../../assets/giao_dien/giaodien1/astrology/today/heart_flower.webp'),
  compassMap: require('../../../assets/giao_dien/giaodien1/astrology/today/compass_map.webp'),
};

export function getGuidanceArtwork(planet: string): number {
  return PLANET_PNG[planet as PlanetId] ?? ASTROLOGY_BACKGROUNDS.today;
}

