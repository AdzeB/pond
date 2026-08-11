import { useEffect } from "react";
import { tabs } from "@/stores/tabs";

export function TabShortcuts() {
  useEffect(() => {
    const unsubs = [
      window.pond.onTabNew(() => tabs.open("/")),
      window.pond.onTabClose(() => {
        if (!tabs.close(tabs.getState().activeId)) window.close();
      }),
      window.pond.onTabReopen(() => tabs.reopenClosed()),
    ];
    return () => {
      for (const unsub of unsubs) unsub();
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      const shift = e.shiftKey;

      if (e.ctrlKey && e.key === "Tab") {
        e.preventDefault();
        if (shift) tabs.activatePrev();
        else tabs.activateNext();
        return;
      }

      if (meta && e.altKey && e.key === "ArrowRight") {
        e.preventDefault();
        tabs.activateNext();
        return;
      }
      if (meta && e.altKey && e.key === "ArrowLeft") {
        e.preventDefault();
        tabs.activatePrev();
        return;
      }

      if (meta && !shift && !e.altKey) {
        const num = Number.parseInt(e.key, 10);
        if (num >= 1 && num <= 9) {
          e.preventDefault();
          const list = tabs.getState().tabs;
          const idx = num === 9 ? list.length - 1 : num - 1;
          tabs.activateByIndex(idx);
        }
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return null;
}
