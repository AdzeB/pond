import type { TweetCardData } from "@shared/tweet-card";
import { useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { TweetCard } from "./components/tweet-card";

const DEFAULT_WIDTH = 550;
const IMAGE_WAIT_MS = 6000;

const params = new URLSearchParams(location.search);
const SCHEME: "light" | "dark" =
  params.get("scheme") === "dark" ? "dark" : "light";
const WIDTH = Number(params.get("w") ?? DEFAULT_WIDTH) || DEFAULT_WIDTH;

document.documentElement.style.background = SCHEME === "dark" ? "#000" : "#fff";

function decodePayload(): TweetCardData {
  try {
    const raw = params.get("data") ?? "";
    return JSON.parse(decodeURIComponent(escape(atob(raw)))) as TweetCardData;
  } catch {
    return { author: { name: "", handle: "" } };
  }
}

const PAYLOAD = decodePayload();

function waitForImages(root: HTMLElement): Promise<void> {
  const pending = Array.from(root.querySelectorAll("img")).filter(
    (img) => !img.complete,
  );
  if (pending.length === 0) return Promise.resolve();
  return new Promise((resolve) => {
    let remaining = pending.length;
    const done = () => {
      remaining -= 1;
      if (remaining <= 0) resolve();
    };
    for (const img of pending) {
      img.addEventListener("load", done, { once: true });
      img.addEventListener("error", done, { once: true });
    }
    setTimeout(resolve, IMAGE_WAIT_MS);
  });
}

function CaptureCard() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        if (document.fonts?.ready) await document.fonts.ready;
      } catch {
        /** Fonts API may be unavailable; proceed without waiting. */
      }
      if (ref.current) await waitForImages(ref.current);
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      if (!cancelled) document.documentElement.dataset.ready = "1";
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div ref={ref} data-capture-card style={{ width: WIDTH }}>
      <TweetCard data={PAYLOAD} scheme={SCHEME} />
    </div>
  );
}

const root = document.getElementById("capture-root");

if (root) createRoot(root).render(<CaptureCard />);
