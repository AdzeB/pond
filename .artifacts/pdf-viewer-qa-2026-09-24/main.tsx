import React from "react";
import { createRoot } from "react-dom/client";
import { StoredFileViewer } from "@/features/saves/components/viewers/file-viewer";
import type { Save } from "@/features/saves/types";
import "../../apps/desktop/src/renderer/src/styles.css";

Reflect.set(globalThis, "pond", {
  query: async () => ({ ok: true }),
  tx: async () => ({ ok: true }),
});

const save: Save = {
  id: "qa-pdf",
  source: "local",
  sourceId: "qa-pdf",
  url: "",
  title: "Viewer system notes",
  description: null,
  author: null,
  notes: null,
  mediaUrl: null,
  mediaType: "file",
  files: [
    {
      path: "document.pdf",
      kind: "file",
      size: 18_240,
      sha256: "qa-pdf-fixture",
      mimeType: "application/pdf",
    },
  ],
  tags: [],
  savedAt: 0,
  createdAt: 0,
  deletedAt: null,
};

const file = save.files[0];
const root = document.getElementById("root");
if (!root || !file) throw new Error("PDF QA fixture failed to initialize");

createRoot(root).render(
  <React.StrictMode>
    <StoredFileViewer save={save} file={file} />
  </React.StrictMode>,
);
