/** Image clipboard/disk writes go through IPC (nativeImage) rather than the renderer, matching saves.copyImage. */

import { notify } from "@/lib/ui/toast";

function captureFrameDataUrl(video: HTMLVideoElement): string | null {
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) return null;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  try {
    ctx.drawImage(video, 0, 0, width, height);
    return canvas.toDataURL("image/png");
  } catch {
    /** Tainted canvas (cross-origin frame). */
    return null;
  }
}

export async function copyVideoFrame(video: HTMLVideoElement): Promise<void> {
  const dataUrl = captureFrameDataUrl(video);
  if (!dataUrl) return;
  await window.pond.query("video.copyFrame", { dataUrl });
  notify({
    id: "copy-frame",
    title: "Frame copied to clipboard",
  });
}

export async function saveVideoFrame(video: HTMLVideoElement): Promise<void> {
  const dataUrl = captureFrameDataUrl(video);
  if (!dataUrl) return;
  await window.pond.query("video.saveFrame", { dataUrl });
  notify({
    id: "save-frame",
    title: "Frame saved",
  });
}

export async function setVideoThumbnail(
  saveId: string,
  video: HTMLVideoElement,
): Promise<void> {
  const dataUrl = captureFrameDataUrl(video);
  if (!dataUrl) return;
  await window.pond.query("video.setThumbnail", { saveId, dataUrl });
}
