import { useEffect } from "react";
import { useBootReady } from "@/features/saves/hooks/use-saves";
import { dismissBootCover } from "@/shared/lib/boot-cover";

export function BootScreen() {
  const bootReady = useBootReady();

  useEffect(() => {
    if (!bootReady) return;
    dismissBootCover();
  }, [bootReady]);

  return null;
}
