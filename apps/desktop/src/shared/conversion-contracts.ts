import { z } from "zod";
export const ConversionPresetSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().trim().min(1).max(200),
  format: z.enum(["jpeg", "png", "webp", "gif"]),
  width: z.number().int().min(1).max(8192).nullable().default(null),
  height: z.number().int().min(1).max(8192).nullable().default(null),
  quality: z.number().int().min(1).max(100).default(85),
  start: z.number().min(0).max(86400).default(0),
  duration: z.number().min(0.1).max(60).default(5),
  fps: z.number().int().min(1).max(30).default(12),
});
export type ConversionPreset = z.infer<typeof ConversionPresetSchema>;
export const ConversionRequestSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(10_000),
  fileIndex: z.number().int().min(0).default(0),
  preset: ConversionPresetSchema,
});
export interface ConversionJob {
  id: string;
  status: "running" | "complete" | "cancelled" | "failed";
  completed: number;
  total: number;
  directory: string;
  outputs: string[];
  error: string | null;
}
export interface ConversionQueryInputs {
  "conversion.presets": Record<string, never>;
  "conversion.savePreset": { preset: ConversionPreset };
  "conversion.deletePreset": { id: string };
  "conversion.start": z.infer<typeof ConversionRequestSchema>;
  "conversion.status": { id: string };
  "conversion.cancel": { id: string };
}
export interface ConversionQueryResults {
  "conversion.presets": ConversionPreset[];
  "conversion.savePreset": ConversionPreset;
  "conversion.deletePreset": { ok: true };
  "conversion.start": ConversionJob | null;
  "conversion.status": ConversionJob | null;
  "conversion.cancel": ConversionJob | null;
}

export const ConversionApiRequestSchema = ConversionRequestSchema.extend({
  directory: z.string().min(1),
});
