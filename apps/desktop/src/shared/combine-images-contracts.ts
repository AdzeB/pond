import { z } from "zod";
import { RasterCompositionOptionsSchema } from "./conversion-contracts";

export const CombineImagesOptionsSchema = RasterCompositionOptionsSchema.extend(
  {
    direction: z.enum(["horizontal", "vertical"]).default("horizontal"),
    order: z.enum(["selection", "reverse"]).default("selection"),
    alignment: z.enum(["start", "center", "end"]).default("center"),
    width: z.number().int().min(1).max(32_768).nullable().default(null),
    height: z.number().int().min(1).max(32_768).nullable().default(null),
    spacing: z.number().int().min(0).max(4_096).default(0),
    margin: z.number().int().min(0).max(4_096).default(0),
    radius: z.number().int().min(0).max(4_096).default(0),
    background: z
      .string()
      .regex(/^#[0-9a-f]{6}$/i)
      .default("#ffffff"),
    opacity: z.number().min(0).max(1).default(1),
    output: z.enum(["create", "export"]).default("create"),
    outputPath: z.string().min(1).nullable().default(null),
    deleteOriginals: z.boolean().default(false),
  },
);

export type CombineImagesOptions = z.infer<typeof CombineImagesOptionsSchema>;
