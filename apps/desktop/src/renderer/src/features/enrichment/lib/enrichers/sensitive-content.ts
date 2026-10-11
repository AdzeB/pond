import type { RawImage } from "@huggingface/transformers";
import { buildMediaUnits } from "@/features/saves/media";
import type { Save } from "@/features/saves/types";
import { loadImage } from "../image";
import {
  aggregateSensitiveScores,
  classifySensitiveImages,
  SENSITIVE_CONTENT_MODEL_VERSION,
} from "../sensitive-content";
import type { Enricher } from "../types";

async function loadSample(
  bytes: Uint8Array,
  mimeType: string,
): Promise<RawImage> {
  const { RawImage } = await import("@huggingface/transformers");
  return RawImage.fromBlob(
    new Blob([Uint8Array.from(bytes).buffer], { type: mimeType }),
  );
}

async function visualScores(save: Save): Promise<number[]> {
  const units = buildMediaUnits(save);
  const imageUrls = new Set<string>();
  for (const unit of units) {
    if (unit.isVideo) {
      if (unit.posterUrl) imageUrls.add(unit.posterUrl);
    } else {
      imageUrls.add(unit.url);
    }
  }

  const imageResults = await Promise.allSettled(
    [...imageUrls].map((url) => loadImage(url)),
  );
  const images = imageResults.flatMap((result) =>
    result.status === "fulfilled" ? [result.value] : [],
  );
  const scores = images.length > 0 ? await classifySensitiveImages(images) : [];

  for (const unit of units) {
    if (!unit.isVideo) continue;
    try {
      const result = await window.pond.query("video.sampleFrames", {
        src: unit.url,
        maxFrames: 12,
      });
      if (!result.ok) continue;
      const decoded = await Promise.allSettled(
        result.frames.map((sample) =>
          loadSample(sample.bytes, sample.mimeType),
        ),
      );
      const frames = decoded.flatMap((frame) =>
        frame.status === "fulfilled" ? [frame.value] : [],
      );
      if (frames.length > 0) {
        scores.push(...(await classifySensitiveImages(frames)));
      }
    } catch {}
  }
  return scores;
}

export const sensitiveContentEnricher: Enricher = {
  id: "sensitive-content",
  enabled: (prefs) => prefs?.ai?.enableSensitiveContent === true,
  eligible(save: Save) {
    if (save.status !== "complete" || save.deletedAt != null) return false;
    if (buildMediaUnits(save).length === 0) return false;
    return save.sensitiveModel !== SENSITIVE_CONTENT_MODEL_VERSION;
  },
  async run(save: Save) {
    const sensitiveScore = aggregateSensitiveScores(await visualScores(save));
    if (sensitiveScore == null) return null;
    const fields = {
      sensitiveScore,
      sensitiveModel: SENSITIVE_CONTENT_MODEL_VERSION,
    };
    return { derived: fields, optimistic: fields };
  },
};
