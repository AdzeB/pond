import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { normalise } from "@/features/saves/lib/reconcile";
import { ImageComments } from "./image-comments";

const createdAt = Date.UTC(2026, 8, 15, 18, 0, 0);

const save = normalise({
  id: "comment-list",
  source: "web",
  sourceId: "fixture",
  url: "https://fixture.test",
  files: [
    {
      kind: "original",
      path: "reference.png",
      sha256: "0123456789abcdef",
      size: 4096,
      mimeType: "image/png",
      width: 1200,
      height: 1800,
    },
  ],
  comments: [
    {
      id: "looks-good",
      x: 0.1,
      y: 0.1,
      w: 0.2,
      h: 0.2,
      text: "Look Good",
      fileIndex: 0,
      createdAt,
      replies: [
        {
          id: "reply",
          text: "Ready to ship",
          createdAt: createdAt + 60 * 60 * 1000,
        },
      ],
    },
    {
      id: "other-file",
      x: 0.1,
      y: 0.1,
      w: 0.2,
      h: 0.2,
      text: "Other file",
      fileIndex: 1,
      createdAt,
    },
    {
      id: "resolved",
      x: 0.2,
      y: 0.2,
      w: 0,
      h: 0,
      text: "Already resolved",
      fileIndex: 0,
      createdAt,
      resolvedAt: createdAt + 1,
    },
  ],
});

let root: Root;
let host: HTMLDivElement;

beforeEach(() => {
  vi.spyOn(Date, "now").mockReturnValue(createdAt + 2 * 60 * 60 * 1000);
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

it("opens each comment beside its compact inspector row", async () => {
  if (!save) throw new Error("Invalid fixture");
  await act(async () =>
    root.render(<ImageComments save={save} fileIndex={0} />),
  );
  const comment = [...host.querySelectorAll("button")].find((button) =>
    button.textContent?.includes("Look Good"),
  );
  if (!comment) throw new Error("Missing comment");
  expect(comment.getAttribute("data-width")).toBe("full");
  expect(comment.querySelector("time")).toBeNull();
  expect(comment.querySelector("img")?.src).toContain(
    "pond://comment-list/reference.png",
  );
  expect(comment.querySelector("img")?.style.objectPosition).toBe("20% 20%");
  expect(host.textContent).not.toContain("Other file");
  expect(host.textContent).not.toContain("Already resolved");

  await act(async () => comment.click());
  const editor = document.querySelector<HTMLElement>('[aria-label="Comment"]');
  expect(editor).not.toBeNull();
  expect(editor?.textContent).toContain("Look Good");
  expect(editor?.textContent).toContain("Ready to ship");
  expect(
    editor?.querySelector<HTMLTextAreaElement>('textarea[placeholder="Reply"]')
      ?.value,
  ).toBe("");
  const times = editor?.querySelectorAll("time");
  expect(times?.[0]?.dateTime).toBe(new Date(createdAt).toISOString());
  expect(times?.[0]?.textContent).toBe("2 hours ago");
  expect(times?.[1]?.textContent).toBe("1 hour ago");
});
