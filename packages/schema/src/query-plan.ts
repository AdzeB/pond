/**
 * Query-plan IR: a validated filter.
 * Intentionally not a general program: only this typed step exists, so a model can never make the app execute arbitrary logic.
 */

import { z } from "zod";
import type { Query } from "./filters/types";

export interface QueryPlan {
  filter: Query;
}

/**
 * Lenient parse of untrusted model output: `filter` passes through as unknown and is re-validated by the
 * renderer's validateQuery. Unknown extra keys are stripped.
 */
export const rawQueryPlanSchema = z.object({
  filter: z.unknown().optional(),
});

export type RawQueryPlan = z.infer<typeof rawQueryPlanSchema>;

export function parseQueryPlan(
  raw: z.input<typeof rawQueryPlanSchema>,
): RawQueryPlan | null {
  const res = rawQueryPlanSchema.safeParse(raw);
  return res.success ? res.data : null;
}
