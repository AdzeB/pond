import { FIELD_IDS } from "@pond/schema/filters/meta";
import { COMPARATORS_BY_TYPE } from "@pond/schema/filters/types";
import { z } from "zod";

export const queryOutputSchema = z.object({
  combinator: z.enum(["and", "or"]),
  rules: z.array(
    z.object({
      field: z.enum(FIELD_IDS),
      operator: z.enum(Object.values(COMPARATORS_BY_TYPE).flat()),
      value: z.union([
        z.string(),
        z.number(),
        z.boolean(),
        z.null(),
        z.array(z.union([z.string(), z.number()])),
        z.object({ hex: z.string(), tolerance: z.number() }),
      ]),
      negate: z.boolean().optional(),
    }),
  ),
});
