/** pond:// video taints a renderer canvas, so the frame is decoded in main from the file at currentTime. */

import { notify } from "@/lib/ui/toast";

function frameParams(video: HTMLVideoElement): {
  src: string;
  timeSec: number;
} | null {
  const src = video.currentSrc || video.src;
  if (!src) return null;
  return { src, timeSec: video.currentTime };
}

export async function copyVideoFrame(video: HTMLVideoElement): Promise<void> {
  const params = frameParams(video);
  if (!params) return;
  const result = (await window.pond.query("video.copyFrame", params)) as {
    ok: boolean;
  };
  if (!result?.ok) return;
  notify({
    id: "copy-frame",
    title: "Frame copied to clipboard",
  });
}

export async function saveVideoFrame(video: HTMLVideoElement): Promise<void> {
  const params = frameParams(video);
  if (!params) return;
  const result = (await window.pond.query("video.saveFrame", params)) as {
    ok: boolean;
  };
  if (!result?.ok) return;
  notify({
    id: "save-frame",
    title: "Frame saved",
  });
}

export async function setVideoThumbnail(
  saveId: string,
  video: HTMLVideoElement,
): Promise<void> {
  const params = frameParams(video);
  if (!params) return;
  await window.pond.query("video.setThumbnail", { saveId, ...params });
}
