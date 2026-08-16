import { useEffect } from "react";
import { useBootReady } from "@/hooks/use-saves";
import { dismissBootCover } from "@/lib/ui/boot-cover";

/** Dismisses the HTML launch cover once the save pool is ready. */
export function BootScreen() {
  const bootReady = useBootReady();

  useEffect(() => {
    if (!bootReady) return;
    dismissBootCover();
  }, [bootReady]);

  return null;
}
