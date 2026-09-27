import { PrefsSchema } from "@pond/schema";
import React from "react";
import { createRoot } from "react-dom/client";
import { MediaViewer } from "@/features/saves/components/viewers/media-viewer";
import { pool } from "@/features/saves/state/pool";
import type { Save } from "@/features/saves/types";
import "../../apps/desktop/src/renderer/src/styles.css";

Reflect.set(globalThis, "pond", {
  query: async (name: string) => {
    if (name === "saves.mediaTiming") return { frameRate: 30 };
    return PrefsSchema.parse({});
  },
  tx: async () => ({ ok: true }),
  openSaveFile: async () => ({ ok: true }),
});

const save: Save = {
  id: "qa-video",
  source: "local",
  sourceId: "qa-video",
  url: "",
  title: "Detail viewer motion study",
  description: null,
  author: null,
  notes: null,
  mediaUrl: null,
  mediaType: "video",
  files: [
    {
      path: "motion-study.mp4",
      kind: "video",
      size: 5_520_000,
      sha256: "qa-video-fixture",
      mimeType: "video/mp4",
      width: 1920,
      height: 1080,
    },
  ],
  tags: [],
  savedAt: 0,
  createdAt: 0,
  deletedAt: null,
};

pool.upsert(save);

const root = document.getElementById("root");
if (!root) throw new Error("Video QA fixture failed to initialize");

createRoot(root).render(
  <React.StrictMode>
    <MediaViewer save={save} />
  </React.StrictMode>,
);
