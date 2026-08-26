import { useMemo } from "react";
import { useResolvedTheme } from "@/hooks/use-resolved-theme";
import type { MediaPickOptions } from "@/lib/media/units";
import { usePrefs } from "@/stores/prefs";

export function useMediaPickOptions(): MediaPickOptions {
  const theme = useResolvedTheme();
  const [preferences] = usePrefs("preferences");
  const tweetCover = preferences?.tweetCover;
  return useMemo(() => ({ theme, tweetCover }), [theme, tweetCover]);
}
