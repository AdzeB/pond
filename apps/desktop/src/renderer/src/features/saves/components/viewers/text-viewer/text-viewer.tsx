import { useEffect, useState } from "react";
import { ensureTextCover } from "@/features/saves/lib/ensure-text-cover";
import { mutateSave } from "@/features/saves/lib/mutate";
import { textBodyForSave } from "@/features/saves/lib/text";
import type { Save } from "@/features/saves/types";
import { renderRichText } from "@/shared/components/expandable-text/expandable-text";
import { useScrollFade } from "@/shared/hooks/use-scroll-fade";
import styles from "./text-viewer.module.css";

export function TextViewer({ save }: { save: Save }) {
  const body = textBodyForSave(save);
  const editable = save.source === "local";
  const [draft, setDraft] = useState(body);
  const scrollFade = useScrollFade<HTMLDivElement>();

  useEffect(() => {
    setDraft(body);
  }, [body]);

  useEffect(() => {
    ensureTextCover(save);
  }, [save]);

  const commit = async () => {
    const next = draft.trim();
    const prev = body;
    if (next === prev) return;
    await mutateSave(
      save.id,
      { description: next || null },
      { actorReason: "user:edit-description" },
    );
    ensureTextCover({ ...save, description: next || null }, { force: true });
  };

  if (!body && !editable) return null;

  return (
    <div className={styles.root} {...scrollFade}>
      <div className={styles.frame}>
        {editable ? (
          <textarea
            className={`${styles.body} ${styles.editor}`}
            value={draft}
            aria-label="Note"
            placeholder="Write a note"
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => void commit()}
          />
        ) : (
          <p className={styles.body}>{renderRichText(body)}</p>
        )}
      </div>
    </div>
  );
}
