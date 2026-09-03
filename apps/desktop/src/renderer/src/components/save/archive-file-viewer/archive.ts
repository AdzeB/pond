export interface ArchiveBounds {
  entries: number;
  compressed: number;
  uncompressed: number;
}

export interface ArchiveSafety {
  safe: boolean;
  reason: string | null;
}

const MAX_ARCHIVE_BYTES = 250 * 1024 ** 2;
const MAX_EXPANDED_BYTES = 1024 ** 3;
const MAX_ENTRIES = 10_000;

export function archiveSafety(bounds: ArchiveBounds): ArchiveSafety {
  if (bounds.entries > MAX_ENTRIES) {
    return { safe: false, reason: "too many entries" };
  }
  if (bounds.compressed > MAX_ARCHIVE_BYTES) {
    return { safe: false, reason: "archive is too large" };
  }
  if (bounds.uncompressed > MAX_EXPANDED_BYTES) {
    return { safe: false, reason: "expanded content is too large" };
  }
  return { safe: true, reason: null };
}
