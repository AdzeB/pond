import { useCallback, useEffect, useState } from "react";

// Native HTMLVideoElement Picture-in-Picture — the OS-drawn floating overlay
// (macOS "Back to Tab"/Close, center pause, ±15s skips). The Document
// Picture-in-Picture API (custom window contents) is not supported by Electron
// (electron/electron#39633), so native PiP is the player's pop-out.
export function usePip(opts: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
}): { pipSupported: boolean; pipActive: boolean; requestPip: () => void } {
  const { videoRef } = opts;
  const [pipSupported, setPipSupported] = useState(false);
  const [pipActive, setPipActive] = useState(false);

  useEffect(() => {
    setPipSupported(document.pictureInPictureEnabled);
  }, []);

  const requestPip = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (document.pictureInPictureElement) {
      void document.exitPictureInPicture().catch(() => {});
      return;
    }
    void video
      .requestPictureInPicture?.()
      .then(() => {
        setPipActive(true);
        video.addEventListener(
          "leavepictureinpicture",
          () => setPipActive(false),
          { once: true },
        );
      })
      .catch(() => {});
  }, [videoRef]);

  return { pipSupported, pipActive, requestPip };
}
