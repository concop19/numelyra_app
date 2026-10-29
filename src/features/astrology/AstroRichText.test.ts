import { tokenizeAstroText } from './AstroRichText';

describe('tokenizeAstroText', () => {
  it('handles empty content cleanly', () => {
    expect(tokenizeAstroText('')).toEqual([]);
  });

  it('tokenizes planets correctly in Vietnamese and English', () => {
    const text = 'Sao Hỏa di chuyển qua Mặt Trời và Mars connects with Venus.';
    const tokens = tokenizeAstroText(text);

    const planetTokens = tokens.filter((t) => t.type === 'planet').map((t) => t.text);
    expect(planetTokens).toContain('Sao Hỏa');
    expect(planetTokens).toContain('Mặt Trời');
    expect(planetTokens).toContain('Mars');
    expect(planetTokens).toContain('Venus');
  });

  it('tokenizes zodiacs and symbols correctly', () => {
    const text = 'Năng lượng Song Tử ♊ và Bạch Dương ♈ cùng tỏa sáng trong Aries.';
    const tokens = tokenizeAstroText(text);

    const zodiacTokens = tokens.filter((t) => t.type === 'zodiac').map((t) => t.text);
    expect(zodiacTokens).toContain('Song Tử');
    expect(zodiacTokens).toContain('♊');
    expect(zodiacTokens).toContain('Bạch Dương');
    expect(zodiacTokens).toContain('♈');
    expect(zodiacTokens).toContain('Aries');
  });

  it('tokenizes houses, orbs, and angles correctly', () => {
    const text = 'Nhà 3 cho thấy góc vuông với orb 0.5° tại 14.5°. House 10 cũng được kích hoạt.';
    const tokens = tokenizeAstroText(text);

    const houses = tokens.filter((t) => t.type === 'house').map((t) => t.text);
    expect(houses).toContain('Nhà 3');
    expect(houses).toContain('House 10');

    const degrees = tokens.filter((t) => t.type === 'degree').map((t) => t.text);
    expect(degrees).toContain('orb 0.5°');
    expect(degrees).toContain('14.5°');

    const tensions = tokens.filter((t) => t.type === 'tension').map((t) => t.text);
    expect(tensions).toContain('góc vuông');
  });

  it('tokenizes harmony and mode words correctly', () => {
    const text = 'Trong bản mệnh, dòng năng lượng hài hòa và thuận dòng giúp hóa giải quá cảnh.';
    const tokens = tokenizeAstroText(text);

    const modes = tokens.filter((t) => t.type === 'mode').map((t) => t.text);
    expect(modes).toContain('bản mệnh');
    expect(modes).toContain('quá cảnh');

    const harmonies = tokens.filter((t) => t.type === 'harmony').map((t) => t.text);
    expect(harmonies).toContain('hài hòa');
    expect(harmonies).toContain('thuận dòng');
  });

  it('tokenizes custom markdown bold correctly', () => {
    const text = 'Hãy **tập trung vào công việc** và giữ bình tĩnh.';
    const tokens = tokenizeAstroText(text);

    const boldToken = tokens.find((t) => t.type === 'bold');
    expect(boldToken).toEqual({
      text: 'tập trung vào công việc',
      type: 'bold',
    });
  });
});
