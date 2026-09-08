// @vitest-environment jsdom

import type { SyncSchedule } from "@shared/sync-schedule";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ScheduleEditor } from "./schedule";

let root: Root;
let host: HTMLDivElement;
const save = vi.fn<(schedule: SyncSchedule) => void | Promise<void>>();
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  save.mockReset();
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
  const select = host.querySelector<HTMLSelectElement>(
    value === "manual"
      ? 'select[aria-label="Schedule mode"]'
      : 'select[aria-label="Repeat"]',
  );
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
  await choose("day");
  expect(save).not.toHaveBeenCalled();
  await submit();
  expect(save).toHaveBeenCalledWith(
    expect.objectContaining({
      enabled: true,
      recurrence: expect.objectContaining({ unit: "day", every: 12 }),
    }),
  );
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
  expect(save).toHaveBeenCalledWith(
    expect.objectContaining({
      enabled: false,
      recurrence: expect.objectContaining({ unit: "day" }),
    }),
  );
});

it("shows a save failure and keeps the draft available to retry", async () => {
  save.mockRejectedValueOnce(new Error("disk unavailable"));
  await render({ enabled: true, intervalHours: 12 });
  await submit();
  expect(host.textContent).toContain("Couldn’t save your schedule");
  expect(host.textContent).not.toContain("Schedule saved.");
  expect(host.querySelector('button[type="submit"]')).toHaveProperty(
    "disabled",
    false,
  );
});

it("retains monthly settings when switching manual off again", async () => {
  await render({
    enabled: true,
    intervalHours: 12,
    recurrence: {
      startDate: "2026-09-09",
      every: 2,
      unit: "month",
      time: "18:00",
      days: [3],
    },
  });
  await choose("manual");
  const mode = host.querySelector<HTMLSelectElement>(
    'select[aria-label="Schedule mode"]',
  );
  if (!mode) throw new Error("Missing schedule mode");
  await act(async () => {
    mode.value = "scheduled";
    mode.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await submit();
  expect(save).toHaveBeenCalledWith(
    expect.objectContaining({
      enabled: true,
      recurrence: {
        startDate: "2026-09-09",
        every: 2,
        unit: "month",
        time: "18:00",
        days: [3],
      },
    }),
  );
});
