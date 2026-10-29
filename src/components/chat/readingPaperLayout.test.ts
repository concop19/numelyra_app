import {
  READING_PAPER_ASPECT_RATIO,
  resolveExpandedReadingPaperLayout,
} from './readingPaperLayout';

describe('expanded Tarot reading paper layout', () => {
  it('fits a standard portrait phone inside its safe area', () => {
    const layout = resolveExpandedReadingPaperLayout({
      viewportWidth: 390,
      viewportHeight: 844,
      insets: { top: 47, bottom: 34 },
    });

    expect(layout.width / layout.height).toBeCloseTo(READING_PAPER_ASPECT_RATIO, 5);
    expect(layout.left).toBeGreaterThanOrEqual(0);
    expect(layout.top).toBeGreaterThanOrEqual(47);
    expect(layout.top + layout.height).toBeLessThanOrEqual(844 - 34);
  });

  it('uses height as the limiting dimension on a landscape viewport', () => {
    const layout = resolveExpandedReadingPaperLayout({
      viewportWidth: 844,
      viewportHeight: 390,
      insets: { top: 0, right: 44, bottom: 21, left: 44 },
    });

    expect(layout.width / layout.height).toBeCloseTo(READING_PAPER_ASPECT_RATIO, 5);
    expect(layout.top + layout.height).toBeLessThanOrEqual(390 - 21);
    expect(layout.left).toBeGreaterThan(44);
  });

  it('caps the paper width on tablets while keeping it centered', () => {
    const layout = resolveExpandedReadingPaperLayout({
      viewportWidth: 1024,
      viewportHeight: 1366,
      insets: { top: 24, bottom: 20 },
    });

    expect(layout.width).toBe(620);
    expect(layout.left).toBeCloseTo((1024 - 620) / 2, 5);
    expect(layout.contentWidth).toBeLessThan(layout.width);
    expect(layout.contentHeight).toBeLessThan(layout.height);
  });

  it('rejects an empty viewport', () => {
    expect(() => resolveExpandedReadingPaperLayout({
      viewportWidth: 0,
      viewportHeight: 844,
    })).toThrow('greater than zero');
  });
});
