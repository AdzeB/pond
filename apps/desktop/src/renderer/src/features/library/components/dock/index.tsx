import { useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { downloadsSelection } from "@/features/downloads";
import { selection } from "@/features/saves/navigation";
import { sourcesSelection } from "@/features/sources";

export function LibraryTray() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isDownloads = pathname.startsWith("/downloads");
  const isSources = pathname.startsWith("/sources");

  useEffect(() => {
    if (isDownloads) {
      selection.clear();
      sourcesSelection.clear();
      return () => downloadsSelection.clear();
    }
    if (isSources) {
      selection.clear();
      downloadsSelection.clear();
      return () => sourcesSelection.clear();
    }
  }, [isDownloads, isSources]);

  return null;
}
