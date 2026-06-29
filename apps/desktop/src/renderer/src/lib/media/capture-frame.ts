// Capture the currently displayed frame of a <video> as a PNG data URL, then
// hand it to the main process. Image clipboard/disk writes go through IPC
// (nativeImage) rather than the renderer, matching saves.copyImage.

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
    return null; // tainted canvas (cross-origin frame)
  }
}

export async function copyVideoFrame(video: HTMLVideoElement): Promise<void> {
  const dataUrl = captureFrameDataUrl(video);
  if (!dataUrl) return;
  await window.pond.query("video.copyFrame", { dataUrl });
}

export async function saveVideoFrame(video: HTMLVideoElement): Promise<void> {
  const dataUrl = captureFrameDataUrl(video);
  if (!dataUrl) return;
  await window.pond.query("video.saveFrame", { dataUrl });
}

export async function setVideoThumbnail(
  saveId: string,
  video: HTMLVideoElement,
): Promise<void> {
  const dataUrl = captureFrameDataUrl(video);
  if (!dataUrl) return;
  await window.pond.query("video.setThumbnail", { saveId, dataUrl });
}
