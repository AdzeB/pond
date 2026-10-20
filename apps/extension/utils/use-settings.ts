import { useEffect, useState } from "react";
import { getSettings, watchSettings } from "./settings";
import type { PondSettings } from "./types";

export function useSettings(): PondSettings | null {
  const [settings, setSettings] = useState<PondSettings | null>(null);

  useEffect(() => {
    void getSettings().then(setSettings);
    return watchSettings(setSettings);
  }, []);

  return settings;
}
