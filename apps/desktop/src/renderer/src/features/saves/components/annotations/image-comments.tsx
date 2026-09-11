import type { ImageComment } from "@pond/schema/db";
import { Button } from "@pond/ui";
import { useState } from "react";
import { Section } from "@/features/saves/components/detail/section/section";
import { inspect } from "@/features/saves/state/inspect";
import type { Save } from "@/features/saves/types";
import { CommentEditor } from "./comment-editor";
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
          <ul>
            {comments.map((comment) => (
              <li key={comment.id}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditing({ comment, creating: false })}
                >
                  {comment.text}
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
