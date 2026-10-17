import { useVideo } from "@pond/ui";
import styles from "./styles.module.css";

/** Sits under the video until its fade-in ends, so opening a video never shows an empty box. */
function Start({ src, covered }: { src?: string; covered: boolean }) {
  if (!src) return null;
  return (
    <img
      src={src}
      alt=""
      aria-hidden
      className={styles.placeholder}
      data-covered={covered || undefined}
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
