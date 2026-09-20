export function videoScaleForRotation(
  viewportWidth: number,
  viewportHeight: number,
  mediaRatio: number | null,
  rotation: number,
): number {
  if (
    rotation % 180 === 0 ||
    viewportWidth <= 0 ||
    viewportHeight <= 0 ||
    !mediaRatio ||
    mediaRatio <= 0
  ) {
    return 1;
  }
  const viewportRatio = viewportWidth / viewportHeight;
  const displayedWidth =
    mediaRatio >= viewportRatio ? viewportWidth : viewportHeight * mediaRatio;
  const displayedHeight =
    mediaRatio >= viewportRatio ? viewportWidth / mediaRatio : viewportHeight;
  return Math.min(
    1,
    viewportWidth / displayedHeight,
    viewportHeight / displayedWidth,
  );
}
