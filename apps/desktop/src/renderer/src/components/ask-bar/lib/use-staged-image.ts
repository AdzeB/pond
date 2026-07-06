import { useCallback, useEffect, useRef, useState } from "react";
import type { PendingImage } from "./use-ask-submit";

// Owns the staged query image (image-to-image visual search) before it's sent:
// the file picker input, paste/drop handlers, and object-URL lifecycle.
export function useStagedImage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);
  // Mirror of the staged image so an unmount (dock collapse) can revoke an
  // unsent object URL without revoking one already handed to a turn.
  const pendingRef = useRef<PendingImage | null>(null);
  pendingRef.current = pendingImage;

  // Stage an image file for the next send (file picker / paste / drop).
  const acceptImageFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    setPendingImage((prev) => {
      if (prev) {
        try {
          URL.revokeObjectURL(prev.url);
        } catch {
          /* already revoked */
        }
      }
      return {
        blob: file,
        url: URL.createObjectURL(file),
        name: file.name || "image",
      };
    });
  }, []);

  const removePendingImage = useCallback(() => {
    setPendingImage((prev) => {
      if (prev) {
        try {
          URL.revokeObjectURL(prev.url);
        } catch {
          /* already revoked */
        }
      }
      return null;
    });
  }, []);

  const onPickImage = useCallback(() => fileInputRef.current?.click(), []);

  const onPaste = useCallback(
    (event: React.ClipboardEvent) => {
      const file = Array.from(event.clipboardData.files).find((f) =>
        f.type.startsWith("image/"),
      );
      if (file) {
        event.preventDefault();
        acceptImageFile(file);
      }
    },
    [acceptImageFile],
  );

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      const file = Array.from(event.dataTransfer.files).find((f) =>
        f.type.startsWith("image/"),
      );
      if (file) {
        event.preventDefault();
        acceptImageFile(file);
      }
    },
    [acceptImageFile],
  );

  // Revoke a staged-but-unsent image URL if the composer unmounts (e.g. the
  // dock collapses). A sent image is already null here, so its turn keeps it.
  useEffect(() => {
    return () => {
      if (pendingRef.current) {
        try {
          URL.revokeObjectURL(pendingRef.current.url);
        } catch {
          /* already revoked */
        }
      }
    };
  }, []);

  return {
    fileInputRef,
    pendingImage,
    setPendingImage,
    acceptImageFile,
    removePendingImage,
    onPickImage,
    onPaste,
    onDrop,
  };
}
