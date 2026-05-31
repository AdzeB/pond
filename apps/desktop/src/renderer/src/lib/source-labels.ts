const SOURCE_LABELS: Record<string, string> = {
  twitter: "X / Twitter",
  x: "X / Twitter",
  cosmos: "Cosmos",
  arena: "Are.na",
  "are.na": "Are.na",
  facebook: "Facebook",
  instagram: "Instagram",
  pinterest: "Pinterest",
  tiktok: "TikTok",
  youtube: "YouTube",
  dribbble: "Dribbble",
  local: "Local",
};

export function getSourceLabel(source: string): string {
  const known = SOURCE_LABELS[source.toLowerCase()];
  if (known) return known;
  return source.charAt(0).toUpperCase() + source.slice(1);
}
