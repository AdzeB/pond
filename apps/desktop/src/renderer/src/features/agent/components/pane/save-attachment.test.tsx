// @vitest-environment jsdom
import type { AssistantSource } from "@shared/assistant";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { pool } from "@/features/saves/state/pool";
import type { Save } from "@/features/saves/types";
import { SaveAttachment } from "./save-attachment";

const source: AssistantSource = {
  id: "attachment-test",
  title: "Color study",
  source: "local",
  url: "",
};
const save: Save = {
  ...source,
  source: "local",
  sourceId: source.id,
  title: source.title,
  description: null,
  author: null,
  notes: null,
  mediaUrl: null,
  mediaType: "image",
  files: [{ kind: "original", path: "study.png", size: 100, sha256: "" }],
  tags: [],
  savedAt: 0,
  createdAt: 0,
  deletedAt: null,
};
let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  pool.delete(source.id);
  host.remove();
  vi.unstubAllGlobals();
});

it("opens the Save and removes it through separate controls", async () => {
  pool.upsert(save);
  const open = vi.fn();
  const remove = vi.fn();
  await act(async () =>
    root.render(
      <SaveAttachment source={source} onOpen={open} onRemove={remove} />,
    ),
  );
  expect(host.querySelector("img")?.getAttribute("src")).toContain(
    "pond://attachment-test/study.png",
  );
  await act(async () =>
    host
      .querySelector<HTMLButtonElement>('[aria-label="Remove Color study"]')
      ?.click(),
  );
  expect(remove).toHaveBeenCalledExactlyOnceWith(source.id);
  expect(open).not.toHaveBeenCalled();
  await act(async () =>
    host
      .querySelector<HTMLButtonElement>('[aria-label="Open Color study"]')
      ?.click(),
  );
  expect(open).toHaveBeenCalledExactlyOnceWith(source.id);
});

it("falls back to a usable title chip after an image fails", async () => {
  pool.upsert(save);
  const open = vi.fn();
  await act(async () =>
    root.render(<SaveAttachment source={source} onOpen={open} />),
  );
  await act(async () =>
    host.querySelector("img")?.dispatchEvent(new Event("error")),
  );
  expect(host.querySelector("img")).toBeNull();
  expect(host.querySelector('[data-image="false"]')).not.toBeNull();
  expect(host.querySelector('[aria-label="Remove Color study"]')).toBeNull();
  await act(async () =>
    host.querySelector<HTMLButtonElement>("button")?.click(),
  );
  expect(open).toHaveBeenCalledExactlyOnceWith(source.id);
});

it("uses a video poster and keeps nonvisual Saves compact", async () => {
  pool.upsert({
    ...save,
    mediaType: "video",
    files: [
      { kind: "original", path: "film.mp4", size: 100, sha256: "" },
      { kind: "poster", path: "poster.jpg", size: 100, sha256: "" },
    ],
  });
  await act(async () =>
    root.render(<SaveAttachment source={source} onOpen={vi.fn()} />),
  );
  expect(host.querySelector("img")?.getAttribute("src")).toContain(
    "poster.jpg",
  );
  expect(host.querySelector("video")).toBeNull();
  await act(async () => pool.upsert({ ...save, mediaType: "text" }));
  expect(host.querySelector("img")).toBeNull();
  expect(host.textContent).toContain(source.title);
});
