import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { sendMessage } from "./messaging";
import { paintTheme } from "./paint-theme";
import type { ProbeResult } from "./probe";

/** Probes Pond through the background and paints the Library's theme on the page. */
export function useLibrary() {
  const [result, setResult] = useState<ProbeResult | null>(null);

  const refresh = useCallback(async () => {
    setResult(null);
    setResult(
      await sendMessage("probe", undefined).catch(
        (): ProbeResult => ({ state: "offline" }),
      ),
    );
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const theme =
    result?.state === "connected" ? (result.library.theme ?? null) : null;
  useLayoutEffect(() => paintTheme(document.documentElement, theme), [theme]);

  return { result, refresh };
}
