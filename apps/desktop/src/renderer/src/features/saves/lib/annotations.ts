import type { ImageComment, VideoNote } from "@pond/schema/db";
import { mutateSave } from "@/features/saves/lib/mutate";
import { pool } from "@/features/saves/state/pool";
export async function saveImageComment(
  saveId: string,
  comment: ImageComment,
): Promise<void> {
  const comments = pool.get(saveId)?.comments ?? [];
  const exists = comments.some((item) => item.id === comment.id);
  const nextComment = exists
    ? comment
    : { ...comment, createdAt: comment.createdAt ?? Date.now() };
  const next = exists
    ? comments.map((item) => (item.id === comment.id ? nextComment : item))
    : [...comments, nextComment];
  await mutateSave(
    saveId,
    { comments: next },
    { throwOnError: true, actorReason: "inspect:comment" },
  );
}
export async function deleteImageComment(
  saveId: string,
  id: string,
): Promise<void> {
  await mutateSave(
    saveId,
    {
      comments: (pool.get(saveId)?.comments ?? []).filter(
        (item) => item.id !== id,
      ),
    },
    { throwOnError: true, actorReason: "inspect:comment-delete" },
  );
}
export async function saveVideoNote(
  saveId: string,
  note: VideoNote,
): Promise<void> {
  const notes = pool.get(saveId)?.videoNotes ?? [];
  const next = notes.some((item) => item.id === note.id)
    ? notes.map((item) => (item.id === note.id ? note : item))
    : [...notes, note];
  await mutateSave(
    saveId,
    { videoNotes: next },
    { throwOnError: true, actorReason: "user:video-note" },
  );
}
export async function deleteVideoNote(
  saveId: string,
  id: string,
): Promise<void> {
  await mutateSave(
    saveId,
    {
      videoNotes: (pool.get(saveId)?.videoNotes ?? []).filter(
        (item) => item.id !== id,
      ),
    },
    { throwOnError: true, actorReason: "user:video-note-delete" },
  );
}
