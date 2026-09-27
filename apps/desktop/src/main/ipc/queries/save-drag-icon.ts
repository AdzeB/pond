const ICON_WIDTH = 96;
const ICON_HEIGHT = 76;

export function saveDragIconSvg(
  thumbnailDataUrls: readonly string[],
  count: number,
): string {
  const thumbnails = thumbnailDataUrls.slice(0, 3);
  const layers = (thumbnails.length > 0 ? thumbnails : [null])
    .map((source, index) => {
      const x = 4 + index * 6;
      const y = 4 + index * 4;
      const fill = source
        ? `<image href="${source}" x="${x}" y="${y}" width="60" height="60" preserveAspectRatio="xMidYMid slice" clip-path="url(#card-${index})"/>`
        : `<rect x="${x}" y="${y}" width="60" height="60" rx="10" fill="#d7d7da"/>`;
      return `<g><rect x="${x}" y="${y}" width="60" height="60" rx="10" fill="#f5f5f6" stroke="#ffffff" stroke-width="2"/>${fill}</g>`;
    })
    .reverse()
    .join("");
  const clipPaths = thumbnails
    .map((_, index) => {
      const x = 4 + index * 6;
      const y = 4 + index * 4;
      return `<clipPath id="card-${index}"><rect x="${x}" y="${y}" width="60" height="60" rx="10"/></clipPath>`;
    })
    .join("");
  const label = count > 999 ? "999+" : String(count);
  const badgeWidth = label.length > 2 ? 38 : 28;
  const badgeX = ICON_WIDTH - badgeWidth - 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ICON_WIDTH}" height="${ICON_HEIGHT}" viewBox="0 0 ${ICON_WIDTH} ${ICON_HEIGHT}"><defs>${clipPaths}</defs>${layers}<rect x="${badgeX}" y="48" width="${badgeWidth}" height="26" rx="13" fill="#1677ff" stroke="#ffffff" stroke-width="2"/><text x="${badgeX + badgeWidth / 2}" y="65" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,sans-serif" font-size="12" font-weight="700" fill="#ffffff">${label}</text></svg>`;
}
