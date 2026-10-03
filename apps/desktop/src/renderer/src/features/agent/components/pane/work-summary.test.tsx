import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { formatWorkDuration, WorkSummary } from "./work-summary";

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

it.each([
  [0, "1s"],
  [90000, "1m 30s"],
  [60000, "1m"],
  [3600000, "1h"],
  [3661000, "1h 1m 1s"],
])("formats %i milliseconds as %s", (duration, expected) => {
  expect(formatWorkDuration(duration)).toBe(expected);
});

it("starts collapsed and exposes actual activity when expanded", async () => {
  await act(async () =>
    root.render(
      <WorkSummary
        metadata={{
          elapsedMs: 90000,
          steps: [
            {
              id: "search",
              label: "Search library",
              detail: "Typography",
              status: "complete",
              elapsedMs: 1500,
            },
            { id: "read", label: "Read Save", status: "error" },
          ],
        }}
      />,
    ),
  );
  const trigger = host.querySelector("button");
  expect(trigger?.textContent).toBe("Worked for 1m 30s");
  expect(trigger?.getAttribute("aria-expanded")).toBe("false");
  await act(async () => {
    trigger?.click();
  });
  expect(trigger?.getAttribute("aria-expanded")).toBe("true");
  expect(host.textContent).toContain("Search library");
  expect(host.textContent).toContain("Typography");
  expect(host.textContent).toContain("Completed · 1s");
  expect(host.textContent).toContain("Failed");
  await act(async () => {
    trigger?.click();
  });
  expect(trigger?.getAttribute("aria-expanded")).toBe("false");
});

it("retains historical activity without inventing elapsed time", async () => {
  await act(async () =>
    root.render(
      <WorkSummary
        metadata={{
          steps: [{ id: "old", label: "Search library", status: "complete" }],
        }}
      />,
    ),
  );
  expect(host.querySelector("button")?.textContent).toBe("Activity");
  await act(async () => root.render(<WorkSummary metadata={null} />));
  expect(host.querySelector("button")).toBeNull();
});

it("hides the summary for a short reply without activity", async () => {
  await act(async () =>
    root.render(<WorkSummary metadata={{ elapsedMs: 29_999 }} />),
  );
  expect(host.querySelector("button")).toBeNull();
});

it("shows elapsed time after a reply takes 30 seconds", async () => {
  await act(async () =>
    root.render(<WorkSummary metadata={{ elapsedMs: 30_000 }} />),
  );
  expect(host.querySelector("button")?.textContent).toBe("Worked for 30s");
});

it("does not grow into place when an existing summary first mounts", async () => {
  await act(async () =>
    root.render(<WorkSummary metadata={{ elapsedMs: 30_000 }} />),
  );
  const reveal = host.firstElementChild;
  if (!(reveal instanceof HTMLElement)) throw new Error("Missing work summary");
  expect(reveal.style.height).not.toBe("0px");
});

it("keeps short tool activity without emphasizing its duration", async () => {
  await act(async () =>
    root.render(
      <WorkSummary
        metadata={{
          elapsedMs: 2_000,
          steps: [
            { id: "search", label: "Search library", status: "complete" },
          ],
        }}
      />,
    ),
  );
  expect(host.querySelector("button")?.textContent).toBe("Activity");
});

it("waits for completion and describes stopped runs without claiming a reply", async () => {
  const metadata = { elapsedMs: 2000, stopped: true };
  await act(async () =>
    root.render(<WorkSummary metadata={metadata} streaming />),
  );
  expect(host.querySelector("button")).toBeNull();
  await act(async () => root.render(<WorkSummary metadata={metadata} />));
  expect(host.querySelector("button")?.textContent).toBe("Activity");
  await act(async () => host.querySelector("button")?.click());
  expect(host.textContent).toContain("Stopped before completing the reply.");
});
