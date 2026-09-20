import type { SyncSchedule } from "@shared/sync-schedule";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ScheduleEditor } from "./";

let root: Root;
let host: HTMLDivElement;
const save = vi.fn<(schedule: SyncSchedule) => void | Promise<void>>();
beforeEach(() => {
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
async function choose(label: string, optionLabel: string) {
  const trigger = host.querySelector<HTMLButtonElement>(
    `button[aria-label="${label}"]`,
  );
  if (!trigger) throw new Error(`Missing ${label} selector`);
  await act(async () => trigger.click());
  const option = [...document.querySelectorAll('[role="option"]')].find(
    (item) => item.textContent === optionLabel,
  );
  if (!(option instanceof HTMLElement))
    throw new Error(`Missing ${optionLabel} option`);
  await act(async () => option.click());
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
  await choose("Repeat", "days");
  expect(save).not.toHaveBeenCalled();
  await submit();
  expect(save).toHaveBeenCalledWith(
    expect.objectContaining({
      enabled: true,
      recurrence: expect.objectContaining({ unit: "day", every: 12 }),
    }),
  );
  expect(host.textContent).not.toContain("Schedule saved.");
  expect(host.textContent).not.toContain("Next fetch:");
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
  await choose("Schedule mode", "Manual");
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
  await choose("Schedule mode", "Manual");
  await choose("Schedule mode", "Schedule");
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
