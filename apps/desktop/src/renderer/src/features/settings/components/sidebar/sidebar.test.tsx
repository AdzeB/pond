import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it } from "vitest";
import { SettingsSidebarView } from ".";

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

it("starts with the search when there is no exit action", async () => {
  await act(async () => {
    root.render(<SettingsSidebarView activeSection="general" />);
  });

  const navigation = host.querySelector('[aria-label="Settings"]');
  const search = host.querySelector('[aria-label="Search settings"]');

  expect(navigation?.firstElementChild?.contains(search)).toBe(true);
  expect(host.textContent).not.toContain("Exit settings");
});

it("keeps the exit header when an exit action is available", async () => {
  await act(async () => {
    root.render(
      <SettingsSidebarView activeSection="general" onExit={() => {}} />,
    );
  });

  const navigation = host.querySelector('[aria-label="Settings"]');
  const exit = [...host.querySelectorAll("button")].find(
    (button) => button.textContent === "Exit settings",
  );

  expect(navigation?.firstElementChild?.contains(exit ?? null)).toBe(true);
});
