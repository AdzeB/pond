import { useEffect } from "react";
import { startSensitiveSweep } from "@/core/data/nsfw";

// Kicks off the background NSFW classification sweep once the app is mounted.
// The sweep watches the saves pool and classifies any unclassified saves so
// the Sensitivity filter (and blur) have data, persisting each verdict to the
// DB. It's idempotent and runs for the app's lifetime.
export function SensitiveSweep() {
  useEffect(() => startSensitiveSweep(), []);
  return null;
}
