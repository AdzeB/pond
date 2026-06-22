import { useEffect } from "react";
import { startEnrichmentSweep } from "@/lib/enrichment/sweep";

// Kicks off the single background on-device enrichment sweep once the app is
// mounted. Replaces the standalone NSFW + embedding sweep mounts; every enricher
// (sensitivity, text embedding, caption, OCR, transcript, CLIP, aesthetic,
// auto-title, suggested-tags) is driven from here via the registry.
export function EnrichmentSweep() {
  useEffect(() => startEnrichmentSweep(), []);
  return null;
}
