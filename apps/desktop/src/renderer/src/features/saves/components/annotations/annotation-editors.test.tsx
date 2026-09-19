import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { normalise } from "@/features/saves/lib/reconcile";
import { pool } from "@/features/saves/state/pool";
import { CommentEditor } from "./comment-editor";
import { VideoNoteEditor } from "./video-note-editor";

const comment = {
  id: "region",
  x: 0.2,
  y: 0.1,
  w: 0.3,
  h: 0.4,
  text: "Original region",
  fileIndex: 2,
};
const note = {
  id: "note",
  timeSec: 1.5,
  text: "Original moment",
  fileIndex: 1,
};
let root: Root;
let host: HTMLDivElement;
const tx = vi.fn(async () => ({ ok: true }));
const closed = vi.fn();
beforeEach(() => {
  vi.stubGlobal("pond", { tx });
  tx.mockReset();
  tx.mockResolvedValue({ ok: true });
  closed.mockClear();
  const save = normalise({
    id: "annotation-fixture",
    source: "web",
    sourceId: "fixture",
    url: "https://fixture.test",
    comments: [comment, { ...comment, id: "other", fileIndex: 0 }],
    videoNotes: [note],
    rotate: 90,
    flipX: true,
  });
  if (!save) throw Error("Invalid fixture");
  pool.upsert(save);
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
function button(text: string) {
  const button = [...document.querySelectorAll("button")].find(
    (button) => button.textContent === text,
  );
  if (!button) throw Error(`Missing ${text}`);
  return button;
}
async function fill(
  element: HTMLInputElement | HTMLTextAreaElement,
  value: string,
) {
  await act(async () => {
    const prototype =
      element instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, "value")?.set?.call(
      element,
      value,
    );
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
}
it("cancels a region edit without persisting it", async () => {
  await act(async () =>
    root.render(
      <CommentEditor
        saveId="annotation-fixture"
        comment={comment}
        onClose={closed}
      />,
    ),
  );
  const text = document.querySelector("textarea");
  if (!text) throw Error("Missing editor");
  await fill(text, "Discarded text");
  await act(async () => button("Cancel").click());
  expect(tx).not.toHaveBeenCalled();
  expect(closed).toHaveBeenCalledOnce();
  expect(pool.get("annotation-fixture")?.comments?.[0]).toEqual(comment);
});
it("edits comment text and supplies undo with the previous values", async () => {
  await act(async () =>
    root.render(
      <CommentEditor
        saveId="annotation-fixture"
        comment={comment}
        onClose={closed}
      />,
    ),
  );
  const text = document.querySelector("textarea");
  if (!text) throw Error("Missing fields");
  await fill(text, "Updated region");
  await act(async () => button("Save Comment").click());
  expect(tx).toHaveBeenCalledWith(
    expect.objectContaining({
      kind: "update",
      model: "save",
      patch: {
        comments: [
          { ...comment, text: "Updated region" },
          { ...comment, id: "other", fileIndex: 0 },
        ],
      },
      before: {
        comments: [comment, { ...comment, id: "other", fileIndex: 0 }],
      },
    }),
  );
  expect(pool.get("annotation-fixture")).toMatchObject({
    rotate: 90,
    flipX: true,
  });
  expect(closed).toHaveBeenCalledOnce();
});
it("keeps the draft open and rolls back when persistence fails", async () => {
  tx.mockRejectedValue(new Error("disk full"));
  vi.spyOn(console, "warn").mockImplementation(() => {});
  await act(async () =>
    root.render(
      <CommentEditor
        saveId="annotation-fixture"
        comment={comment}
        onClose={closed}
      />,
    ),
  );
  const text = document.querySelector("textarea");
  if (!text) throw Error("Missing editor");
  await fill(text, "Keep this draft");
  await act(async () => button("Save Comment").click());
  expect(closed).not.toHaveBeenCalled();
  expect(text.value).toBe("Keep this draft");
  expect(document.querySelector('[role="alert"]')?.textContent).toContain(
    "Couldn’t save",
  );
  expect(pool.get("annotation-fixture")?.comments?.[0]).toEqual(comment);
});
it("updates video-note text and exact time while preserving its attachment and undo", async () => {
  await act(async () =>
    root.render(
      <VideoNoteEditor
        saveId="annotation-fixture"
        note={note}
        onClose={closed}
      />,
    ),
  );
  const text = document.querySelector("textarea");
  const time = document.querySelector("input");
  if (!text || !time) throw Error("Missing fields");
  await fill(text, "Edited moment");
  await fill(time, "3.125");
  await act(async () => button("Save Note").click());
  expect(tx).toHaveBeenCalledWith(
    expect.objectContaining({
      patch: {
        videoNotes: [{ ...note, text: "Edited moment", timeSec: 3.125 }],
      },
      before: { videoNotes: [note] },
    }),
  );
  expect(closed).toHaveBeenCalledOnce();
});
