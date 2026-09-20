import { LocaleSchema } from "@pond/schema";
import { z } from "zod";

const PreviewWindowKindSchema = z.enum(["presentation", "detached"]);

export const PreviewWindowOpenSchema = z.object({
  saveId: z.string().min(1),
  fileIndex: z.number().int().nonnegative().default(0),
  kind: PreviewWindowKindSchema,
});
export type PreviewWindowOpen = z.infer<typeof PreviewWindowOpenSchema>;

export const PreviewWindowConfigureSchema = z.object({
  windowId: z.number().int().positive(),
  opacity: z.number().min(0.2).max(1).optional(),
  alwaysOnTop: z.boolean().optional(),
  rotation: z
    .union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)])
    .optional(),
  mirrored: z.boolean().optional(),
  grayscale: z.boolean().optional(),
  size: z.enum(["fit", "actual"]).optional(),
});
export type PreviewWindowConfigure = z.infer<
  typeof PreviewWindowConfigureSchema
>;

export const PreviewWindowNavigateSchema = z.object({
  windowId: z.number().int().positive(),
  saveId: z.string().min(1),
  fileIndex: z.number().int().nonnegative(),
});
export type PreviewWindowNavigate = z.infer<typeof PreviewWindowNavigateSchema>;

export const PreviewNeighborRequestSchema = z.object({
  windowId: z.number().int().positive(),
  saveId: z.string().min(1),
  delta: z.union([z.literal(-1), z.literal(1)]),
});
export type PreviewNeighborRequest = z.infer<
  typeof PreviewNeighborRequestSchema
>;

export const PreviewWindowStateSchema = z.object({
  windowId: z.number().int().positive(),
  saveId: z.string().min(1),
  fileIndex: z.number().int().nonnegative(),
  kind: PreviewWindowKindSchema,
  title: z.string(),
  locale: LocaleSchema,
  url: z.string(),
  opacity: z.number().min(0.2).max(1),
  alwaysOnTop: z.boolean(),
  rotation: z.union([
    z.literal(0),
    z.literal(90),
    z.literal(180),
    z.literal(270),
  ]),
  mirrored: z.boolean(),
  grayscale: z.boolean(),
  size: z.enum(["fit", "actual"]),
});
export type PreviewWindowState = z.infer<typeof PreviewWindowStateSchema>;

export interface PreviewWindowOpenResult {
  windowId: number;
}
