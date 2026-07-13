import { z } from "zod";

/** HTTP enqueue contract; the desktop pipeline derives everything else from the URL. */
export const enqueueRequestSchema = z.object({
  url: z.string().url(),
  trigger: z.string().max(64).optional(),
});

export type EnqueueRequest = z.infer<typeof enqueueRequestSchema>;

export const enqueueResponseSchema = z.object({
  id: z.string().min(1),
  created: z.boolean(),
});

export type EnqueueResponse = z.infer<typeof enqueueResponseSchema>;
