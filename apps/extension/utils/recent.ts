import { storage } from "wxt/utils/storage";
import { z } from "zod";
import type { CaptureOutcome } from "./outcome";

const LIMIT = 12;

const recentCaptureSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string(),
  kind: z.enum(["page", "link", "media", "screenshot", "images", "site"]),
  status: z.enum(["sending", "saved", "duplicate", "failed", "offline"]),
  saveId: z.string().optional(),
  error: z.string().optional(),
  at: z.number(),
});

export type RecentCapture = z.infer<typeof recentCaptureSchema>;
export type RecentKind = RecentCapture["kind"];

const item = storage.defineItem<RecentCapture[]>("local:recentCaptures");

function parse(value: RecentCapture[] | null): RecentCapture[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const parsed = recentCaptureSchema.safeParse(entry);
    return parsed.success ? [parsed.data] : [];
  });
}

export async function readRecent(): Promise<RecentCapture[]> {
  return parse(await item.getValue());
}

export function watchRecent(
  listener: (entries: RecentCapture[]) => void,
): () => void {
  return item.watch((value) => listener(parse(value)));
}

let writes = Promise.resolve();

/** Serialized because several captures can settle at once and storage writes would otherwise race. */
function write(
  change: (entries: RecentCapture[]) => RecentCapture[],
): Promise<void> {
  writes = writes.then(async () => {
    const next = change(await readRecent()).slice(0, LIMIT);
    await item.setValue(next);
  });
  return writes;
}

export function recordRecent(entry: RecentCapture): Promise<void> {
  return write((entries) => [
    entry,
    ...entries.filter((existing) => existing.id !== entry.id),
  ]);
}

export function settleRecent(outcome: CaptureOutcome): Promise<void> {
  return write((entries) =>
    entries.map((entry) => {
      if (entry.id !== outcome.id) return entry;
      const next: RecentCapture = { ...entry, status: outcome.status };
      if (outcome.status === "failed") next.error = outcome.message;
      if (
        (outcome.status === "saved" || outcome.status === "duplicate") &&
        outcome.saveId
      ) {
        next.saveId = outcome.saveId;
      }
      return next;
    }),
  );
}

export function clearRecent(): Promise<void> {
  return write(() => []);
}
