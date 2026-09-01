export function sourceExcerpt(
  value: string | null | undefined,
  limit = 700,
): string {
  return (value ?? "")
    .replace(/\\[nrt]/g, "\n")
    .replace(/<[^>]*>/g, " ")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(
      (line) =>
        line &&
        !/^(show (?:more|less|transcript)|follow along using the transcript\.?|subscribe|transcript|\.\.\.?more)$/i.test(
          line,
        ),
    )
    .join(" ")
    .replace(/\s+/g, " ")
    .slice(0, limit)
    .trim();
}
