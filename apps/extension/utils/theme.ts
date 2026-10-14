import { z } from "zod";

export const themeVarsSchema = z.object({
  mode: z.enum(["light", "dark"]),
  background: z.string(),
  foreground: z.string(),
  accent: z.string(),
  contrast: z.number(),
});
