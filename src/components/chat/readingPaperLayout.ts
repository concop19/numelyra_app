export type ReadingPaperInsets = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export type ExpandedReadingPaperLayout = {
  left: number;
  top: number;
  width: number;
  height: number;
  contentLeft: number;
  contentTop: number;
  contentWidth: number;
  contentHeight: number;
};

export type ExpandedReadingPaperLayoutOptions = {
  viewportWidth: number;
  viewportHeight: number;
  insets?: Partial<ReadingPaperInsets>;
  maxWidth?: number;
};

export const READING_PAPER_ASPECT_RATIO = 940 / 1672;

const DEFAULT_INSETS: ReadingPaperInsets = {
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
};

/**
 * Fits the portrait parchment inside the visible viewport without changing its
 * authored 9:16-ish aspect ratio. The content box follows the quiet center of
 * the artwork so text never crosses the curled edges or botanical border.
 */
export function resolveExpandedReadingPaperLayout({
  viewportWidth,
  viewportHeight,
  insets: partialInsets,
  maxWidth = 620,
}: ExpandedReadingPaperLayoutOptions): ExpandedReadingPaperLayout {
  if (viewportWidth <= 0 || viewportHeight <= 0) {
    throw new Error('Reading paper viewport dimensions must be greater than zero');
  }

  const insets = { ...DEFAULT_INSETS, ...partialInsets };
  const horizontalGap = viewportWidth < 360 ? 8 : 12;
  const verticalGap = viewportHeight < 640 ? 6 : 10;
  const availableWidth = Math.max(
    1,
    viewportWidth - insets.left - insets.right - (horizontalGap * 2),
  );
  const availableHeight = Math.max(
    1,
    viewportHeight - insets.top - insets.bottom - (verticalGap * 2),
  );

  let width = Math.min(availableWidth, maxWidth);
  let height = width / READING_PAPER_ASPECT_RATIO;

  if (height > availableHeight) {
    height = availableHeight;
    width = height * READING_PAPER_ASPECT_RATIO;
  }

  const left = insets.left
    + ((viewportWidth - insets.left - insets.right - width) / 2);
  const top = insets.top
    + ((viewportHeight - insets.top - insets.bottom - height) / 2);

  const contentLeft = width * 0.105;
  const contentTop = height * 0.15;
  const contentWidth = width * 0.79;
  const contentHeight = height * 0.72;

  return {
    left,
    top,
    width,
    height,
    contentLeft,
    contentTop,
    contentWidth,
    contentHeight,
  };
}
