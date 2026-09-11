import { useEffect, useMemo, useState } from "react";
import { FolderIcon } from "@/features/library/components/folder-sidebar/folder-icons";
import { pickPrimaryFile } from "@/features/saves/lib/media/units";
import { buildPondUrl, thumbUrlFor } from "@/features/saves/lib/media/url";
import type { Save } from "@/features/saves/types";
import styles from "./folder-sidebar.module.css";

export function folderCoverUrl(save: Save): string | null {
  const file = pickPrimaryFile(save);
  if (!file) return null;
  return thumbUrlFor(buildPondUrl(save.id, file), 36);
}

export function FolderCover({
  icon,
  coverSaveId,
}: {
  icon?: string;
  coverSaveId?: string | null;
}) {
  const [save, setSave] = useState<Save | null>(null);
  useEffect(() => {
    if (!coverSaveId) {
      setSave(null);
      return;
    }
    let cancelled = false;
    void window.pond.query("saves.get", { id: coverSaveId }).then((row) => {
      if (!cancelled) {
        /** SAFETY: `saves.get` returns the renderer Save wire shape. */
        setSave(row as Save | null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [coverSaveId]);
  const src = useMemo(() => (save ? folderCoverUrl(save) : null), [save]);
  if (src) {
    return <img className={styles.cover} src={src} alt="" />;
  }
  return <FolderIcon name={icon} />;
}
