import { useEffect } from "react";
import { startEnrichmentSweep } from "@/lib/enrichment/sweep";

/** Single mount point for the background on-device enrichment sweep; every enricher is driven from here via the registry. */
export function EnrichmentSweep() {
  useEffect(() => startEnrichmentSweep(), []);
  return null;
}
