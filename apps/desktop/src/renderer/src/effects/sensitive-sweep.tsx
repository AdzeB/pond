import { useEffect } from "react";
import { startSensitiveSweep } from "@/core/data/nsfw";

// Kicks off the background NSFW classification sweep once the app is mounted.
export function SensitiveSweep() {
  useEffect(() => startSensitiveSweep(), []);
  return null;
}
