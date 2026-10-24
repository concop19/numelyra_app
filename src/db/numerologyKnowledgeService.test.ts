const mockGetAllAsync = jest.fn();
const mockGetFirstAsync = jest.fn();
const mockOpenDatabase = jest.fn(async () => ({
  getAllAsync: mockGetAllAsync,
  getFirstAsync: mockGetFirstAsync,
}));

jest.mock('./cadaoService', () => ({
  openCaDaoDatabase: () => mockOpenDatabase(),
}));

import {
  fetchNumerologyKnowledgeRows,
  getNumerologyKnowledgeCount,
} from './numerologyKnowledgeService';

describe('numerologyKnowledgeService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not open SQLite for an empty lookup', async () => {
    await expect(fetchNumerologyKnowledgeRows('mission', [], 'vi')).resolves.toEqual([]);
    expect(mockOpenDatabase).not.toHaveBeenCalled();
  });

  it('queries every requested atomic value from the bundled SQLite table', async () => {
    const rows = [
      { indicator_key: 'missingNumbers', number_value: '2', title: 'Số 2', content: 'content 2' },
      { indicator_key: 'missingNumbers', number_value: '7', title: 'Số 7', content: 'content 7' },
    ];
    mockGetAllAsync.mockResolvedValue(rows);

    await expect(fetchNumerologyKnowledgeRows('missingNumbers', ['2', '7'], 'vi')).resolves.toEqual(rows);
    expect(mockGetAllAsync).toHaveBeenCalledWith(
      expect.stringContaining('FROM numerology_knowledge'),
      ['missingNumbers', 'vi', '2', '7']
    );
  });

  it('reports the local knowledge row count', async () => {
    mockGetFirstAsync.mockResolvedValue({ total: 320 });
    await expect(getNumerologyKnowledgeCount()).resolves.toBe(320);
  });
});
