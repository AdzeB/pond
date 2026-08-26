import { useEffect } from "react";
import { useBootReady } from "@/hooks/use-saves";
import { dismissBootCover } from "@/lib/ui/boot-cover";

export function BootScreen() {
  const bootReady = useBootReady();

  useEffect(() => {
    if (!bootReady) return;
    dismissBootCover();
  }, [bootReady]);

  return null;
}
