import { useEffect, useState } from "react";
import { qualityDecodeBudget } from "@/features/saves/lib/quality-decode-budget";

export function useQualityImage(
  thumbnail: string,
  original: string,
  enabled: boolean,
): string {
  const [source, setSource] = useState(thumbnail);

  useEffect(() => {
    setSource(thumbnail);
    if (!enabled || thumbnail === original) return;
    let current = true;
    const cancel = qualityDecodeBudget.schedule(async () => {
      const image = new Image();
      image.decoding = "async";
      image.src = original;
      await image.decode();
      if (current) setSource(original);
    });
    return () => {
      current = false;
      cancel();
    };
  }, [enabled, original, thumbnail]);

  return source;
}
