import { z } from "zod";

export const SavedViewPresentationSchema = z.object({
  icon: z
    .enum(["folder", "bookmark", "album", "tag", "download", "code"])
    .optional(),
  color: z
    .enum([
      "red",
      "orange",
      "yellow",
      "green",
      "teal",
      "blue",
      "purple",
      "pink",
    ])
    .nullable()
    .optional(),
  quickAccess: z.boolean().optional(),
  quickAccessOrder: z.number().int().nonnegative().optional(),
});
