import { decode } from "blurhash";
import { useLayoutEffect, useRef } from "react";
import styles from "./styles.module.css";

const SIZE = 32;

export function BlurHash({ hash }: { hash: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    try {
      const pixels = decode(hash, SIZE, SIZE);
      const imageData = ctx.createImageData(SIZE, SIZE);
      imageData.data.set(pixels);
      ctx.putImageData(imageData, 0, 0);
    } catch {
      ctx.clearRect(0, 0, SIZE, SIZE);
    }
  }, [hash]);

  return (
    <canvas
      ref={canvasRef}
      width={SIZE}
      height={SIZE}
      className={styles.hash}
      aria-hidden
    />
  );
}
