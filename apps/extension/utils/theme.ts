import { z } from "zod";

export const themeVarsSchema = z.object({
  mode: z.enum(["light", "dark"]),
  bgL: z.number(),
  bgC: z.number(),
  bgH: z.number(),
  fgL: z.number(),
  fgC: z.number(),
  fgH: z.number(),
  accentL: z.number(),
  accentC: z.number(),
  accentH: z.number(),
  contrast: z.number(),
  background: z.string().optional(),
});
