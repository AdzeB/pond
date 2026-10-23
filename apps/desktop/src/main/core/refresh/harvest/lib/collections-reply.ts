import type { JsonValue } from "@pond/schema/json";
import type { ImportCollectionOption } from "@shared/import-scope";
import { z } from "zod";

const COLLECTION_FAILURES = [
  "auth_required",
  "checkpoint",
  "rate_limited",
  "unknown",
] as const;

export type CollectionFailureReason = (typeof COLLECTION_FAILURES)[number];

/** What an in-page collection listing returns across the page boundary. */
export type CollectionsReply =
  | {
      ok: true;
      collections: Array<{ id: string; name: string; count: number | null }>;
    }
  | { ok: false; reason: CollectionFailureReason; detail?: string };

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
      reason: z.enum(COLLECTION_FAILURES).catch("unknown"),
      detail: z.string().max(200).optional().catch(undefined),
    }),
  ])
  .catch({ ok: false, reason: "unknown", detail: "malformed reply" });

export function readCollectionsReply(
  value: JsonValue,
):
  | { ok: true; collections: ImportCollectionOption[] }
  | { ok: false; reason: CollectionFailureReason; detail?: string } {
  const reply = ReplySchema.parse(value);
  if (!reply.ok) {
    return reply.detail
      ? { ok: false, reason: reply.reason, detail: reply.detail }
      : { ok: false, reason: reply.reason };
  }
  return {
    ok: true,
    collections: reply.collections.map((collection) => ({
      id: collection.id,
      name: collection.name || collection.id,
      itemCount: collection.count,
    })),
  };
}
