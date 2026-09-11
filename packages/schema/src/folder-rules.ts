import { z } from "zod";

export const FolderRulesSchema = z.object({
  automaticTags: z.array(z.string().trim().min(1)).catch([]),
});
