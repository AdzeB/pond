import { useEffect } from "react";
import { renderRichText } from "@/components/shared/expandable-text";
import { ensureTextCover } from "@/lib/save/ensure-text-cover";
import { textBodyForSave } from "@/lib/save/text";
import type { Save } from "@/lib/types";
import styles from "./styles.module.css";

export function TextViewer({ save }: { save: Save }) {
  const body = textBodyForSave(save);

  useEffect(() => {
    ensureTextCover(save);
  }, [save]);

  if (!body) return null;

  return (
    <div className={styles.root}>
      <div className={styles.frame}>
        <p className={styles.body}>{renderRichText(body)}</p>
      </div>
    </div>
  );
}
