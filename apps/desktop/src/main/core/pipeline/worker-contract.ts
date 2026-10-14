import { z } from "zod";

const BytesSchema = z.instanceof(Uint8Array);
const LeaseFields = {
  leaseToken: z.string().min(1),
  cancellationFence: z.number().int().nonnegative(),
};

const ImagePrefsSchema = z.object({
  maxLongEdge: z.number().nullable(),
  maxFileSizeMb: z.number().nullable(),
  format: z.enum(["original", "jpeg", "png", "webp", "avif"]),
  quality: z.number(),
  progressive: z.boolean(),
  lossless: z.boolean(),
  preserveMetadata: z.boolean(),
});

export const QueueWorkerRequestSchema = z.discriminatedUnion("operation", [
  z.object({
    jobId: z.string(),
    ...LeaseFields,
    operation: z.literal("process_image"),
    bytes: BytesSchema,
    filename: z.string().min(1),
    mimeType: z.string().optional(),
    prefs: ImagePrefsSchema,
  }),
  z.object({
    jobId: z.string(),
    ...LeaseFields,
    operation: z.literal("probe_image"),
    bytes: BytesSchema,
  }),
  z.object({
    jobId: z.string(),
    ...LeaseFields,
    operation: z.literal("build_poster"),
    sourcePath: z.string().min(1),
    filename: z.string().min(1),
  }),
]);

export type QueueWorkerRequest = z.infer<typeof QueueWorkerRequestSchema>;
export type QueueWorkerJob = QueueWorkerRequest extends infer Request
  ? Request extends { jobId: string }
    ? Omit<Request, "jobId">
    : never
  : never;

export const QueueWorkerImageResultSchema = z.object({
  bytes: BytesSchema,
  filename: z.string(),
  mimeType: z.string(),
  width: z.number().optional(),
  height: z.number().optional(),
});

export const QueueWorkerPosterResultSchema = z.object({
  kind: z.literal("poster"),
  filename: z.string(),
  bytes: BytesSchema,
  mimeType: z.string(),
  width: z.number().optional(),
  height: z.number().optional(),
});

export const QueueWorkerImageDimsSchema = z.object({
  width: z.number(),
  height: z.number(),
});

export const QueueWorkerResponseSchema = z.discriminatedUnion("ok", [
  z.object({
    jobId: z.string(),
    ...LeaseFields,
    ok: z.literal(true),
    /** Zod strips unknown keys, so the widest shapes go first or a poster would parse as bare dims. */
    result: z.union([
      z.null(),
      QueueWorkerPosterResultSchema,
      QueueWorkerImageResultSchema,
      QueueWorkerImageDimsSchema,
    ]),
  }),
  z.object({
    jobId: z.string(),
    ...LeaseFields,
    ok: z.literal(false),
    error: z.object({
      name: z.string(),
      message: z.string(),
    }),
  }),
]);

export type QueueWorkerResponse = z.infer<typeof QueueWorkerResponseSchema>;
