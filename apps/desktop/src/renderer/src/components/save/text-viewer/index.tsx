import { useEffect, useState } from "react";
import { renderRichText } from "@/components/shared/expandable-text";
import { ensureTextCover } from "@/lib/save/ensure-text-cover";
import { mutateSave } from "@/lib/save/mutate";
import { textBodyForSave } from "@/lib/save/text";
import type { Save } from "@/lib/types";
import styles from "./styles.module.css";

export function TextViewer({ save }: { save: Save }) {
  const body = textBodyForSave(save);
  const editable = save.source === "local";
  const [draft, setDraft] = useState(body);

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
    <div className={styles.root}>
      <div className={styles.frame}>
        {editable ? (
          <textarea
            className={`${styles.body} ${styles.editor}`}
            value={draft}
            aria-label="Note"
            placeholder="Write something…"
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
