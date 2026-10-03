import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ChatContext } from "./chat-context";

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
  vi.unstubAllGlobals();
});

it("uses an icon trigger labeled for library access", async () => {
  await act(async () =>
    root.render(<ChatContext attached={[]} previous={[]} />),
  );
  const trigger = host.querySelector('button[aria-label="Library Access"]');
  expect(trigger?.querySelector("svg")).toBeTruthy();
  expect(trigger?.textContent?.trim()).toBe("");
});
