import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it } from "vitest";
import { TimelinePreview } from ".";

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});

it("keeps a stable frame for portrait video", async () => {
  await act(async () => {
    root.render(<TimelinePreview src="pond://test/portrait.mp4" time={4} />);
  });

  expect(host.querySelector("video")?.style.aspectRatio).toBe("16 / 9");
});
