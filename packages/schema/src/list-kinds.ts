export const LIST_KINDS = ["liked", "saved"] as const;
export type ListKind = (typeof LIST_KINDS)[number];

const ALIASES: Record<string, ListKind> = {
  liked: "liked",
  like: "liked",
  likes: "liked",
  upvote: "liked",
  upvoted: "liked",
  saved: "saved",
  save: "saved",
  bookmark: "saved",
  bookmarks: "saved",
  bookmarked: "saved",
  favorite: "saved",
  favorites: "saved",
  favourite: "saved",
  favourites: "saved",
};

export const LIST_KIND_LABELS: Record<ListKind, string> = {
  liked: "Liked",
  saved: "Saved",
};

export function canonicalListKind(raw: string): ListKind | null {
  return ALIASES[raw.trim().toLowerCase()] ?? null;
}

export function normalizeListKinds(raw: unknown): ListKind[] {
  const found = new Set<ListKind>();
  const visit = (value: unknown): void => {
    if (typeof value === "string") {
      const kind = canonicalListKind(value);
      if (kind) found.add(kind);
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) visit(item);
    }
  };
  visit(raw);
  return LIST_KINDS.filter((kind) => found.has(kind));
}

export function mergeListKinds(...parts: unknown[]): ListKind[] {
  return normalizeListKinds(parts);
}

export function listKindsEqual(a: unknown, b: unknown): boolean {
  const left = normalizeListKinds(a);
  const right = normalizeListKinds(b);
  return (
    left.length === right.length && left.every((kind, i) => kind === right[i])
  );
}

export function formatListKinds(raw: unknown): string | null {
  const kinds = normalizeListKinds(raw);
  if (kinds.length === 0) return null;
  return kinds.map((kind) => LIST_KIND_LABELS[kind]).join(", ");
}
