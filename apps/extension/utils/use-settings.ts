import { useEffect, useState } from "react";
import { getSettings, updateSettings, watchSettings } from "./settings";
import type { PondSettings } from "./types";

export function useSettings() {
  const [settings, setSettings] = useState<PondSettings | null>(null);

  useEffect(() => {
    void getSettings().then(setSettings);
    return watchSettings(setSettings);
  }, []);

  const update = (change: (current: PondSettings) => PondSettings) => {
    void updateSettings(change).then(setSettings);
  };

  return { settings, update };
}
