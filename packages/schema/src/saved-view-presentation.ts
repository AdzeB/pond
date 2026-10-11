import { z } from "zod";
import { FolderIconIdSchema } from "./folder-presentation";

export const SavedViewPresentationSchema = z.object({
  icon: FolderIconIdSchema.optional(),
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
