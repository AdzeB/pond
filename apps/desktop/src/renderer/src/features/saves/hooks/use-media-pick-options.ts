import { useMemo } from "react";
import type { MediaPickOptions } from "@/features/saves/lib/media/units";
import { useResolvedTheme } from "@/shared/hooks/use-resolved-theme";
import { usePrefs } from "@/shared/state/prefs";

export function useMediaPickOptions(): MediaPickOptions {
  const theme = useResolvedTheme();
  const [preferences] = usePrefs("preferences");
  const tweetCover = preferences?.tweetCover;
  return useMemo(() => ({ theme, tweetCover }), [theme, tweetCover]);
}
