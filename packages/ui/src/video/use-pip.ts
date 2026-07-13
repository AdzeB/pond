import { useCallback, useEffect, useState } from "react";

/** Native HTMLVideoElement PiP; Document PiP is unsupported in Electron (electron#39633). */
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
