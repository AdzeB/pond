import type { JsonValue } from "@pond/schema/json";
import type { ImportCollectionOption } from "@shared/import-scope";
import { z } from "zod";

/** What an in-page collection listing returns across the page boundary. */
export type CollectionsReply =
  | {
      ok: true;
      collections: Array<{ id: string; name: string; count: number | null }>;
    }
  | { ok: false; reason: "auth_required" | "rate_limited" | "unknown" };

const ReplySchema = z
  .union([
    z.object({
      ok: z.literal(true),
      collections: z
        .array(
          z.object({
            id: z.string().min(1),
            name: z.string().catch(""),
            count: z.number().nullable().catch(null),
          }),
        )
        .catch([]),
    }),
    z.object({
      ok: z.literal(false),
      reason: z
        .enum(["auth_required", "rate_limited", "unknown"])
        .catch("unknown"),
    }),
  ])
  .catch({ ok: false, reason: "unknown" });

export function readCollectionsReply(
  value: JsonValue,
):
  | { ok: true; collections: ImportCollectionOption[] }
  | { ok: false; reason: "auth_required" | "rate_limited" | "unknown" } {
  const reply = ReplySchema.parse(value);
  if (!reply.ok) return reply;
  return {
    ok: true,
    collections: reply.collections.map((collection) => ({
      id: collection.id,
      name: collection.name || collection.id,
      itemCount: collection.count,
    })),
  };
}
