import { resolvePrimaryDailyProfile } from './dailyProfile';

describe('primary daily profile', () => {
  it('keeps daily content on the primary profile regardless of a reading selection', () => {
    const primary = {
      fullName: 'Minh Anh',
      birthDate: '1998-10-20',
      gender: 'female' as const,
    };
    const readingSelection = { id: 'mother', fullName: 'Mẹ', birthDate: '1970-02-01' };

    const dailyProfile = resolvePrimaryDailyProfile(primary, 'self');

    expect(dailyProfile).toMatchObject({ id: 'self', fullName: 'Minh Anh' });
    expect(dailyProfile?.fullName).not.toBe(readingSelection.fullName);
  });
});
