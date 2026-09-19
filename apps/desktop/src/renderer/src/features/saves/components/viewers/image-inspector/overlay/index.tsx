import type { ImageComment, ImageCrop } from "@pond/schema/db";
import type { CSSProperties } from "react";
import {
  CROP_HANDLES,
  isAreaComment,
} from "@/features/saves/lib/image-regions";
import { CROP_HANDLE_LABEL } from "../crop-handles";
import type { InspectorMode } from "../types";
import styles from "./styles.module.css";

interface ImageOverlayProps {
  active: boolean;
  annotationStyle: CSSProperties;
  comments: ImageComment[];
  draft: ImageCrop | null;
  editingComment: {
    comment: ImageComment;
    creating: boolean;
  } | null;
  mode: InspectorMode;
  onEditComment: (comment: ImageComment) => void;
  onPinElement: (element: HTMLElement | null) => void;
}

export function ImageOverlay({
  active,
  annotationStyle,
  comments,
  draft,
  editingComment,
  mode,
  onEditComment,
  onPinElement,
}: ImageOverlayProps) {
  if (draft && mode === "crop")
    return (
      <div
        className={styles.selection}
        data-cropping=""
        style={{
          left: `${draft.x * 100}%`,
          top: `${draft.y * 100}%`,
          width: `${draft.w * 100}%`,
          height: `${draft.h * 100}%`,
        }}
      >
        {CROP_HANDLES.map((handle) => (
          <button
            key={handle}
            type="button"
            className={styles.handle}
            data-handle={handle}
            aria-label={CROP_HANDLE_LABEL[handle]}
          />
        ))}
      </div>
    );
  if (mode === "crop") return null;

  return (
    <div className={styles.annotations} style={annotationStyle}>
      {comments.map((comment, index) => {
        const area = isAreaComment(comment);
        const activePin = editingComment?.comment.id === comment.id;
        return (
          <div
            key={comment.id}
            className={styles.pin}
            data-area={area || undefined}
            data-active={activePin || undefined}
            ref={activePin && area ? onPinElement : undefined}
            style={{
              left: `${comment.x * 100}%`,
              top: `${comment.y * 100}%`,
              width: area ? `${comment.w * 100}%` : undefined,
              height: area ? `${comment.h * 100}%` : undefined,
            }}
          >
            {area ? <span className={styles.area} /> : null}
            {activePin && area && mode === "comment"
              ? CROP_HANDLES.map((handle) => (
                  <button
                    key={handle}
                    type="button"
                    className={styles.handle}
                    data-handle={handle}
                    aria-label={CROP_HANDLE_LABEL[handle]}
                    onClick={(event) => event.stopPropagation()}
                  />
                ))
              : null}
            <button
              type="button"
              tabIndex={active ? 0 : -1}
              className={styles.index}
              aria-label={
                comment.text
                  ? `Edit comment ${index + 1}: ${comment.text}`
                  : `Comment ${index + 1}`
              }
              title={comment.text || undefined}
              ref={activePin && !area ? onPinElement : undefined}
              onClick={() => {
                if (comment.id === "draft" || editingComment?.creating) return;
                onEditComment(comment);
              }}
            >
              {index + 1}
            </button>
          </div>
        );
      })}
    </div>
  );
}
