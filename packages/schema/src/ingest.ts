import { z } from "zod";
import { extensionCookieSchema } from "./session";

export const enqueueRequestSchema = z.object({
  url: z.string().url(),
  trigger: z.string().max(64).optional(),
  folderId: z.string().min(1).optional(),
  tags: z.array(z.string().trim().min(1)).max(100).optional(),
  preset: z.string().trim().min(1).max(100).optional(),
  idempotencyKey: z.string().trim().min(1).max(200).optional(),
  /** Live-tab cookies for generic web captures so archive_page can replay the signed-in page. */
  cookies: z.array(extensionCookieSchema).max(500).optional(),
});

export type EnqueueRequest = z.infer<typeof enqueueRequestSchema>;

export const enqueueResponseSchema = z.object({
  id: z.string().min(1),
  created: z.boolean(),
});

export type EnqueueResponse = z.infer<typeof enqueueResponseSchema>;
