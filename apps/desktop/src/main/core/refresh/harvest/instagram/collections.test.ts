import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import type { CollectionsReply } from "../lib/collections-reply";
import { buildInstagramCollectionsExpression } from "./collections";

interface Reply {
  status: number;
  /** Absent when Instagram answers with an HTML page. */
  body?: {
    items?: Array<{
      collection_id?: number;
      collection_name?: string;
      collection_type?: string;
      collection_media_count?: number;
    }>;
    more_available?: boolean;
    message?: string;
    status?: string;
  };
}

function run(reply: Reply): Promise<CollectionsReply> {
  return runInNewContext(buildInstagramCollectionsExpression(), {
    URLSearchParams,
    setTimeout: (fn: () => void) => setTimeout(fn, 0),
    fetch: async () => ({
      ok: reply.status >= 200 && reply.status < 300,
      status: reply.status,
      headers: { get: () => (reply.body ? "application/json" : "text/html") },
      json: async () => {
        if (!reply.body) throw new SyntaxError("not json");
        return reply.body;
      },
    }),
  });
}

describe("buildInstagramCollectionsExpression", () => {
  it("lists the collections you made", async () => {
    await expect(
      run({
        status: 200,
        body: {
          items: [
            {
              collection_id: 17,
              collection_name: "Recipes",
              collection_type: "MEDIA",
              collection_media_count: 4,
            },
            { collection_id: 1, collection_type: "ALL_MEDIA_AUTO_COLLECTION" },
          ],
          more_available: false,
        },
      }),
    ).resolves.toEqual({
      ok: true,
      collections: [{ id: "17", name: "Recipes", count: 4 }],
    });
  });

  it("names a checkpoint instead of failing blind", async () => {
    await expect(
      run({
        status: 400,
        body: { message: "checkpoint_required", status: "fail" },
      }),
    ).resolves.toEqual({
      ok: false,
      reason: "checkpoint",
      detail: "checkpoint_required",
    });
  });

  it("treats a login prompt as signed out", async () => {
    await expect(
      run({ status: 400, body: { message: "login_required" } }),
    ).resolves.toEqual({ ok: false, reason: "auth_required" });
  });

  it("reports the status when Instagram answers with a page", async () => {
    await expect(run({ status: 200 })).resolves.toEqual({
      ok: false,
      reason: "unknown",
      detail: "200 text/html",
    });
  });
});
