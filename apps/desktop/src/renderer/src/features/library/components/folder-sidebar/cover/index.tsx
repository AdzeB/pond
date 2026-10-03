import { useEffect, useMemo, useState } from "react";
import { FolderIcon } from "@/features/library/components/folder-sidebar/folder-icons";
import { folderCoverUrl } from "@/features/library/lib/folder-cover";
import { normalise } from "@/features/saves/lib/reconcile";
import type { Save } from "@/features/saves/types";
import styles from "./styles.module.css";

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
      if (!cancelled) setSave(normalise(row));
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
