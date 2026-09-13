import { useAuiState } from "@assistant-ui/react";
import { IconXmarkOutline12 } from "@pond/icons/outline/12";
import { IconFileOutline18, IconImageOutline18 } from "@pond/icons/outline/18";
import { useEffect, useState } from "react";
import { Button } from "../button";
import { Dialog } from "../dialog";
import { Tooltip } from "../tooltip";
import { Attachment } from "./attachment";
import styles from "./attachment-item.module.css";

function useFilePreview(file: File | undefined) {
  const [preview, setPreview] = useState<{ file: File; url: string }>();
  useEffect(() => {
    if (!file?.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    setPreview({ file, url });
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return preview?.file === file ? preview?.url : undefined;
}

export function AttachmentItem({ removable = false }: { removable?: boolean }) {
  const attachment = useAuiState((state) => state.attachment);
  const localPreview = useFilePreview(attachment.file);
  const image = attachment.content?.find((part) => part.type === "image");
  const candidate = localPreview || image?.image;
  const src =
    candidate && /^(https?:\/\/|blob:|data:image\/|\/)/i.test(candidate)
      ? candidate
      : undefined;
  const [failedImage, setFailedImage] = useState<string>();
  const showImage = src && failedImage !== src;
  const extension = attachment.name.split(".").slice(1).at(-1)?.toUpperCase();
  const attachmentStatus = attachment.status;
  const uploading = attachmentStatus.type === "running";
  const error = attachmentStatus.type === "incomplete";
  const status = error
    ? attachmentStatus.message || "Could not attach this file"
    : uploading
      ? "Uploading"
      : attachment.type === "image"
        ? "Image"
        : extension || "File";
  const label = `${attachment.name} · ${status}`;
  return (
    <Attachment.Root className={styles.item} data-error={error || undefined}>
      <Dialog.Root>
        <Tooltip.Provider>
          <Tooltip label={label}>
            <Dialog.Trigger
              render={<Button variant="ghost" className={styles.preview} />}
              aria-label={`Preview ${attachment.name}`}
            >
              {showImage ? (
                <img
                  src={src}
                  alt=""
                  className={styles.image}
                  onError={() => setFailedImage(src)}
                />
              ) : (
                <span className={styles.file}>
                  {attachment.type === "image" ? (
                    <IconImageOutline18 />
                  ) : (
                    <IconFileOutline18 />
                  )}
                  <span>{extension?.slice(0, 5) || "FILE"}</span>
                </span>
              )}
            </Dialog.Trigger>
          </Tooltip>
        </Tooltip.Provider>
        <Dialog.Portal>
          <Dialog.Backdrop />
          <Dialog.Popup className={styles.dialog}>
            <Dialog.Header>
              <Dialog.Title>{attachment.name}</Dialog.Title>
              <Dialog.Close aria-label="Close Preview" />
            </Dialog.Header>
            <Dialog.Description>{status}</Dialog.Description>
            {showImage ? (
              <img
                src={src}
                alt={attachment.name}
                className={styles["full-image"]}
              />
            ) : (
              <div className={styles["file-details"]}>
                <IconFileOutline18 />
                <span>{attachment.contentType || "File attachment"}</span>
                {attachment.file && (
                  <span>
                    {new Intl.NumberFormat().format(attachment.file.size)} bytes
                  </span>
                )}
              </div>
            )}
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
      {removable && (
        <Attachment.Remove
          aria-label={`Remove ${attachment.name}`}
          render={
            <Button
              icon
              size="xs"
              variant="secondary"
              className={styles.remove}
            />
          }
        >
          <IconXmarkOutline12 />
        </Attachment.Remove>
      )}
      {uploading && (
        <span
          className={styles.progress}
          role="progressbar"
          aria-label={`Uploading ${attachment.name}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(attachmentStatus.progress * 100)}
        >
          <span
            style={{
              width: `${Math.max(0, Math.min(1, attachmentStatus.progress)) * 100}%`,
            }}
          />
        </span>
      )}
      {error && (
        <span role="alert" className={styles.error}>
          {status}
        </span>
      )}
    </Attachment.Root>
  );
}
