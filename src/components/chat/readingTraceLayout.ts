/** Positions are derived from the measured scene, not the browser window. */
export function readingTraceLayout(width: number, height: number) {
  const sceneWidth = Math.min(width, 560);
  const sceneHeight = Math.max(height, 540);
  const letterWidth = sceneWidth * 0.9;
  const letterHeight = letterWidth / 2;
  const letterTop = Math.min(sceneHeight * 0.76, sceneHeight - letterHeight - 12);
  return { width: sceneWidth, height: sceneHeight, matTop: sceneHeight * 0.205, matBottom: letterTop - 14, letterWidth, letterHeight, letterTop };
}
export function traceRowCounts(count: number): number[] {
  if (count <= 0) return [];
  if (count <= 3) return [count];
  return count === 4 ? [2, 2] : [3, 2];
}
export function traceCardSlots(count: number, width: number, height: number) {
  const rows = traceRowCounts(count);
  const gap = 8;
  const rowHeight = (height - gap * (rows.length - 1)) / Math.max(1, rows.length);
  let index = 0;
  return rows.flatMap((columns, row) => {
    const cellWidth = Math.min(128, (width - gap * (columns - 1)) / columns);
    const left = (width - columns * cellWidth - gap * (columns - 1)) / 2;
    return Array.from({ length: columns }, (_, column) => ({ index: index++, left: left + column * (cellWidth + gap), top: row * (rowHeight + gap), width: cellWidth, height: rowHeight }));
  });
}
