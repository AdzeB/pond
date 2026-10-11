import { useEffect, useState } from "react";
import {
  type ChapterCue,
  chaptersToVttUrl,
} from "@/features/saves/lib/media/chapters-vtt";

export function useChaptersTrackUrl(
  chapters?: readonly ChapterCue[],
): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const next =
      chapters && chapters.length > 0 ? chaptersToVttUrl(chapters) : null;
    setUrl(next);
    return () => {
      if (next) URL.revokeObjectURL(next);
    };
  }, [chapters]);
  return url;
}
