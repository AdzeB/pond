import { useEffect, useRef } from "react";
import { selectOnlySave } from "@/features/saves/lib/select";

export function ScreenshotIntakeSelection() {
  const mountedAt = useRef(Date.now());
  const selectedEntries = useRef(new Set<string>());

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      if (document.hidden) return;
      const status = await window.pond
        .query("screenshots.status", {})
        .catch(() => null);
      if (!status) return;
      if (!active) return;
      const entry = status.history.find(
        (candidate) =>
          candidate.ok &&
          candidate.autoSelect &&
          candidate.id &&
          candidate.at >= mountedAt.current &&
          !selectedEntries.current.has(
            `${candidate.ruleId}:${candidate.at}:${candidate.id}`,
          ),
      );
      if (!entry?.id) return;
      selectedEntries.current.add(`${entry.ruleId}:${entry.at}:${entry.id}`);
      selectOnlySave(entry.id);
    };
    const timer = window.setInterval(() => void refresh(), 1500);
    void refresh();
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  return null;
}
