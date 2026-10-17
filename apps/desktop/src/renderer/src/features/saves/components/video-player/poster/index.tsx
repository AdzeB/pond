import { useVideo } from "@pond/ui";
import { useEffect, useState } from "react";
import styles from "./styles.module.css";

/** Covers the stage until the first frame decodes so opening a video never shows an empty stage. */
function Start({ src }: { src?: string }) {
  const { meta } = useVideo();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const video = meta.videoRef.current;
    if (!video) return;
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      setReady(true);
      return;
    }
    const reveal = () => setReady(true);
    video.addEventListener("loadeddata", reveal, { once: true });
    return () => video.removeEventListener("loadeddata", reveal);
  }, [meta.videoRef]);
  if (!src || ready) return null;
  return (
    <img
      src={src}
      alt=""
      aria-hidden
      className={styles.poster}
      decoding="sync"
      draggable={false}
    />
  );
}

function End({ src }: { src?: string }) {
  const { state } = useVideo();
  if (!src || !state.ended) return null;
  return <img src={src} alt="" className={styles.poster} draggable={false} />;
}

export const Poster = { Start, End };
