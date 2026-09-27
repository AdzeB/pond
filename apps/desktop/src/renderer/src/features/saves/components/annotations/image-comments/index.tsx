import { IconPlusOutline18 } from "@pond/icons/outline/18";
import type { ImageComment } from "@pond/schema/db";
import { Button } from "@pond/ui";
import { useState } from "react";
import { CommentEditor } from "@/features/saves/components/annotations/comment-editor";
import { CommentsEmpty } from "@/features/saves/components/annotations/comments-empty";
import { Section } from "@/features/saves/components/detail/section";
import { buildMediaUnits } from "@/features/saves/lib/media/units";
import {
  previewThumbUrlFor,
  thumbUrlFor,
} from "@/features/saves/lib/media/url";
import { inspect } from "@/features/saves/state/inspect";
import type { Save } from "@/features/saves/types";
import styles from "./styles.module.css";

export function ImageComments({
  save,
  fileIndex,
  bare = false,
}: {
  save: Save;
  fileIndex: number;
  bare?: boolean;
}) {
  const [editing, setEditing] = useState<{
    anchor: HTMLElement;
    comment: ImageComment;
  } | null>(null);
  const comments = (save.comments ?? []).filter(
    (comment) =>
      comment.resolvedAt == null && (comment.fileIndex ?? 0) === fileIndex,
  );
  const units = buildMediaUnits(save);
  const activePath = save.files[fileIndex]?.path;
  const unit =
    units.find((candidate) => candidate.key === activePath) ?? units[fileIndex];
  const thumbnailUrl = unit
    ? unit.requiresGeneratedPreview
      ? previewThumbUrlFor(unit.url, 72)
      : thumbUrlFor(unit.url, 72)
    : null;
  const addButton = (
    <Button
      type="button"
      icon
      size="xs"
      variant="ghost"
      aria-label="Add Comment"
      onClick={() => inspect.enterComment(save.id, fileIndex)}
    >
      <IconPlusOutline18 />
    </Button>
  );
  const list = comments.length ? (
    <ul className={styles.list}>
      {comments.map((comment) => (
        <li key={comment.id}>
          <Button
            className={styles.comment}
            variant="secondary"
            size="sm"
            width="full"
            onClick={(event) =>
              setEditing({
                anchor: event.currentTarget,
                comment,
              })
            }
          >
            {thumbnailUrl ? (
              <span className={styles.thumbnail} aria-hidden>
                <img
                  src={thumbnailUrl}
                  alt=""
                  draggable={false}
                  style={{
                    objectPosition: `${(comment.x + comment.w / 2) * 100}% ${(comment.y + comment.h / 2) * 100}%`,
                  }}
                />
              </span>
            ) : null}
            <span className={styles.copy}>
              <span className={styles.text}>{comment.text}</span>
            </span>
          </Button>
        </li>
      ))}
    </ul>
  ) : null;
  return (
    <>
      {bare ? (
        <div className={styles.bare}>{list ?? <CommentsEmpty />}</div>
      ) : (
        <Section
          title="Comments"
          empty={comments.length === 0}
          action={addButton}
        >
          {list}
        </Section>
      )}
      {editing ? (
        <CommentEditor
          key={editing.comment.id}
          saveId={save.id}
          comment={editing.comment}
          anchor={editing.anchor}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </>
  );
}
