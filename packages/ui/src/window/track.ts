function clampTrack(width: number, min: number, max: number): number {
  return Math.round(Math.min(max, Math.max(min, width)));
}

export function nextTrackWidth(input: {
  edge: "left" | "right";
  startWidth: number;
  startX: number;
  clientX: number;
  min: number;
  max: number;
  collapseAtMin?: boolean;
}): number | null {
  const delta = input.clientX - input.startX;
  const raw =
    input.edge === "left" ? input.startWidth + delta : input.startWidth - delta;
  if (input.collapseAtMin && raw <= input.min) return null;
  return clampTrack(raw, input.min, input.max);
}
