import contractData from '../data/numerologyKnowledgeContract.vi.json';

export interface NumerologyKnowledgeContractEntry {
  key: string;
  requiredValues: string[];
}

export interface NumerologyKnowledgeAtom {
  indicatorKey: string;
  numberValue: string;
}

const contract = contractData as {
  version: number;
  locale: string;
  indicators: NumerologyKnowledgeContractEntry[];
};

export const NUMEROLOGY_KNOWLEDGE_CONTRACT = contract.indicators;

export const NUMEROLOGY_KNOWLEDGE_REQUIRED_COUNT = NUMEROLOGY_KNOWLEDGE_CONTRACT
  .reduce((total, indicator) => total + indicator.requiredValues.length, 0);

const COMPOSITE_KEYS = new Set([
  'karmicDebts',
  'missingNumbers',
  'passion',
  'bridgeMaturityPassion',
  'way',
  'challenges',
]);

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

export function getRequiredValues(indicatorKey: string): string[] {
  return NUMEROLOGY_KNOWLEDGE_CONTRACT
    .find((indicator) => indicator.key === indicatorKey)
    ?.requiredValues.slice() || [];
}

export function getKnowledgeAtoms(
  indicatorKey: string,
  indicatorValue: string | number
): NumerologyKnowledgeAtom[] {
  const rawValue = String(indicatorValue).trim();
  let values: string[];

  if (indicatorKey === 'karmicDebts') {
    values = rawValue.match(/(?:13\/4|14\/5|16\/7|19\/1)/g) || ['none'];
  } else if (indicatorKey === 'missingNumbers') {
    values = rawValue.match(/[1-9]/g) || ['none'];
  } else if (COMPOSITE_KEYS.has(indicatorKey)) {
    values = rawValue.match(/\d+/g) || [];
  } else {
    values = [rawValue];
  }

  return unique(values).map((numberValue) => ({ indicatorKey, numberValue }));
}

export function getMatrixKnowledgeValue(digit: number, band: string): string {
  return `${digit}:${band}`;
}

export function getArrowKnowledgeValue(label: string, status: string): string {
  return `${label}:${status}`;
}
