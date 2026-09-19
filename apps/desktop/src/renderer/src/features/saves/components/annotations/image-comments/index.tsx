import type { ImageComment } from "@pond/schema/db";
import { Button } from "@pond/ui";
import { useState } from "react";
import { Section } from "@/features/saves/components/detail/section";
import { inspect } from "@/features/saves/state/inspect";
import type { Save } from "@/features/saves/types";
import { relativeTimeFromMs } from "@/shared/lib/relative-time";
import { CommentEditor } from "../comment-editor";
import styles from "./styles.module.css";

export function ImageComments({
  save,
  fileIndex,
}: {
  save: Save;
  fileIndex: number;
}) {
  const [editing, setEditing] = useState<{
    comment: ImageComment;
    creating: boolean;
  } | null>(null);
  const comments = (save.comments ?? []).filter(
    (comment) => (comment.fileIndex ?? 0) === fileIndex,
  );
  return (
    <>
      <Section title="Comments">
        {comments.length ? (
          <ul className={styles.list}>
            {comments.map((comment) => (
              <li key={comment.id}>
                <Button
                  className={styles.comment}
                  variant="secondary"
                  size="sm"
                  width="full"
                  onClick={() => setEditing({ comment, creating: false })}
                >
                  <span className={styles.text}>{comment.text}</span>
                  {comment.createdAt != null ? (
                    <time
                      className={styles.time}
                      dateTime={new Date(comment.createdAt).toISOString()}
                    >
                      {relativeTimeFromMs(comment.createdAt)}
                    </time>
                  ) : null}
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
        <Button
          size="sm"
          variant="secondary"
          onClick={() => inspect.enterComment()}
        >
          Add Image Comment
        </Button>
      </Section>
      {editing ? (
        <CommentEditor
          saveId={save.id}
          comment={editing.comment}
          creating={editing.creating}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </>
  );
}
