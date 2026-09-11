import {
  CaptureDraftSchema,
  CaptureMetadataSchema,
} from "@pond/schema/capture";
import { z } from "zod";
import { openCollectionWindow } from "../../aux-windows";
import { captures } from "../../core/captures";
import { query } from "./params";

const Id = z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/);
export const captureQueries = {
  "captures.accept": query(
    z.object({ draft: CaptureDraftSchema }),
    async ({ draft }) => {
      const result = await captures.accept(draft);
      if (result.state === "draft") await openCollectionWindow();
      return result;
    },
  ),
  "captures.list": query(z.object({}), () => captures.list()),
  "captures.draft": query(z.object({ id: Id }), ({ id }) => captures.draft(id)),
  "captures.resume": query(
    z.object({ id: Id, metadata: CaptureMetadataSchema.optional() }),
    ({ id, metadata }) => captures.resume(id, metadata),
  ),
  "captures.cancel": query(z.object({ id: Id }), async ({ id }) => {
    await captures.cancel(id);
    return { ok: true as const };
  }),
};
