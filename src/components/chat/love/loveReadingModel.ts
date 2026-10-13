export type LoveReadingProfile = {
  id?: string;
  fullName: string;
};

export type LoveReadingViewModel = {
  profileA: LoveReadingProfile;
  profileB: LoveReadingProfile;
  compatibilityScore?: number;
  question?: string;
  summary?: string;
  advice?: string;
  answer: string;
};

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord => (
  !!value && typeof value === 'object' && !Array.isArray(value)
);

const asNonEmptyString = (value: unknown): string | undefined => (
  typeof value === 'string' && value.trim() ? value.trim() : undefined
);

const asProfile = (value: unknown): LoveReadingProfile | undefined => {
  if (!isRecord(value)) return undefined;
  const fullName = asNonEmptyString(value.fullName);
  if (!fullName) return undefined;

  return {
    id: asNonEmptyString(value.id),
    fullName,
  };
};

const asScore = (value: unknown): number | undefined => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return Math.max(0, Math.min(100, Math.round(value)));
};

export function getLoveReadingViewModel(
  card: unknown,
  answer: string,
  fallbackQuestion?: string,
): LoveReadingViewModel | null {
  if (!isRecord(card)) return null;

  const decision = isRecord(card.decision) ? card.decision : undefined;
  const profiles = Array.isArray(card.profiles)
    ? card.profiles.map(asProfile).filter((profile): profile is LoveReadingProfile => !!profile)
    : [];
  const tuViBazi = isRecord(card.tuViBazi)
    ? card.tuViBazi
    : isRecord(card.baziResult)
      ? card.baziResult
      : undefined;
  const personA = asProfile(tuViBazi?.personA) || profiles[0];
  const personB = asProfile(tuViBazi?.personB) || profiles[1];
  const isCompatibility = decision?.mode === 'compatibility'
    || (profiles.length >= 2 && !!tuViBazi)
    || (!!personA && !!personB && typeof tuViBazi?.compatibilityScore === 'number');

  if (!isCompatibility || !personA || !personB) return null;

  return {
    profileA: personA,
    profileB: personB,
    compatibilityScore: asScore(tuViBazi?.compatibilityScore)
      ?? asScore(card.compatibilityScore),
    question: asNonEmptyString(card.questionText) || asNonEmptyString(fallbackQuestion),
    summary: asNonEmptyString(tuViBazi?.summaryVi),
    advice: asNonEmptyString(tuViBazi?.adviceVi),
    answer: answer.trim(),
  };
}
