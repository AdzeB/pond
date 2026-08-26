import { nativeCall } from "@/utils/native";
import type { ThemeVars } from "@/utils/theme";

interface LibraryInfo {
  name: string;
  counts: { active: number };
  theme?: ThemeVars | null;
}

export type ProbeResult =
  | { state: "offline" }
  | { state: "connected"; library: LibraryInfo };

export async function probe(): Promise<ProbeResult> {
  const result = await nativeCall({ type: "library.info" });
  if (!result.ok) return { state: "offline" };
  const data = result.data as LibraryInfo | null;
  if (!data?.name) return { state: "offline" };
  return { state: "connected", library: data };
}
