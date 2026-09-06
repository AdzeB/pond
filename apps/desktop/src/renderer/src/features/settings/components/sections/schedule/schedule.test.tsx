// @vitest-environment jsdom

import type { SyncSchedule } from "@shared/sync-schedule";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ScheduleEditor } from "./schedule";

let root: Root;
let host: HTMLDivElement;
const save = vi.fn<(schedule: SyncSchedule) => void>();
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  save.mockClear();
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});
async function render(initial: SyncSchedule) {
  await act(async () =>
    root.render(<ScheduleEditor initial={initial} onSave={save} />),
  );
}
async function choose(value: string) {
  const select = host.querySelector("select");
  if (!select) throw new Error("Missing repeat selector");
  await act(async () => {
    select.value = value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
}
async function submit() {
  await act(async () =>
    host
      .querySelector("form")
      ?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
  );
}
it("keeps edits as a draft until Save", async () => {
  await render({ enabled: true, intervalHours: 12 });
  await choose("daily");
  expect(save).not.toHaveBeenCalled();
  await submit();
  expect(save).toHaveBeenCalledWith({
    enabled: true,
    intervalHours: 12,
    calendar: { kind: "daily", time: "09:00" },
  });
});
it("loads a weekly schedule and prevents saving without weekdays", async () => {
  await render({
    enabled: true,
    intervalHours: 12,
    calendar: { kind: "weekly", time: "14:30", days: [1] },
  });
  expect(host.querySelector('input[type="time"]')).toHaveProperty(
    "value",
    "14:30",
  );
  const monday = host.querySelector<HTMLButtonElement>(
    'button[aria-label="Monday"]',
  );
  await act(async () => monday?.click());
  await submit();
  expect(save).not.toHaveBeenCalled();
  expect(host.querySelector('button[type="submit"]')).toHaveProperty(
    "disabled",
    true,
  );
});
it("saves manual mode without a calendar rule", async () => {
  await render({
    enabled: true,
    intervalHours: 6,
    calendar: { kind: "daily", time: "09:00" },
  });
  await choose("manual");
  await submit();
  expect(save).toHaveBeenCalledWith({
    enabled: false,
    intervalHours: 6,
    calendar: null,
  });
});
