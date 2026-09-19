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

it("renders each comment as a full-width button with relative time", async () => {
  if (!save) throw new Error("Invalid fixture");
  await act(async () =>
    root.render(<ImageComments save={save} fileIndex={0} />),
  );
  const comment = [...host.querySelectorAll("button")].find((button) =>
    button.textContent?.includes("Look Good"),
  );
  if (!comment) throw new Error("Missing comment");
  expect(comment.getAttribute("data-width")).toBe("full");
  const time = comment.querySelector("time");
  expect(time?.dateTime).toBe(new Date(createdAt).toISOString());
  expect(time?.textContent).toBe("2 hours ago");
  expect(host.textContent).not.toContain("Other file");
});
