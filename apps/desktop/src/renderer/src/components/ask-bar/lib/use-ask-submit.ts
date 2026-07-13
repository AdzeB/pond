import { useCallback } from "react";
import { useAsk } from "@/hooks/use-ask";
import type { AskSegment } from "@/stores/ask-store";

/** Staged query image: `blob` feeds CLIP; `url` is an object URL shown as a thumbnail and handed to the resolved turn. */
export interface PendingImage {
  blob: Blob;
  url: string;
  name: string;
}

export function useAskSubmit() {
  const run = useAsk();
  return useCallback(
    (
      raw: string,
      anchors: string[] = [],
      opts: {
        refine?: boolean;
        image?: PendingImage;
        segments?: ReadonlyArray<AskSegment>;
      } = {},
    ): boolean => {
      const text = raw.trim();
      if (!text && anchors.length === 0 && !opts.image) return false;
      void run(text, anchors, {
        refine: opts.refine,
        segments: opts.segments,
        image: opts.image
          ? {
              blob: opts.image.blob,
              meta: { url: opts.image.url, name: opts.image.name },
            }
          : undefined,
      });
      return true;
    },
    [run],
  );
}
