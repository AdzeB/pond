import { z } from "zod";
import { nativeCall } from "@/utils/native";
import { themeVarsSchema } from "@/utils/theme";

const libraryInfoSchema = z.object({
  name: z.string().min(1),
  counts: z.object({ active: z.number() }).optional().catch(undefined),
  theme: themeVarsSchema.nullish().catch(undefined),
});

type LibraryInfo = z.infer<typeof libraryInfoSchema>;

export type ProbeResult =
  | { state: "offline" }
  | { state: "connected"; library: LibraryInfo };

export async function probe(): Promise<ProbeResult> {
  const result = await nativeCall({ type: "library.info" });
  if (!result.ok) return { state: "offline" };
  const library = libraryInfoSchema.safeParse(result.data);
  if (!library.success) return { state: "offline" };
  return { state: "connected", library: library.data };
}
