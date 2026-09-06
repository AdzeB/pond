// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ProfileField } from "./profile-field";

let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

it("keeps a failed edit available and retries it on the next blur", async () => {
  const save = vi
    .fn<(value: string) => Promise<void>>()
    .mockRejectedValueOnce(new Error("Offline"))
    .mockResolvedValueOnce();
  await act(async () =>
    root.render(
      <ProfileField
        label="Nickname"
        value="Alex"
        placeholder="None"
        icon={null}
        onSave={save}
      />,
    ),
  );
  const field = host.querySelector("input");
  if (!field) throw new Error("Missing nickname field");
  expect(field.getAttribute("aria-label")).toBe("Nickname");
  expect(field.placeholder).toBe("Alex");
  expect(field.value).toBe("");
  await act(async () => {
    field.focus();
    field.blur();
  });
  expect(save).not.toHaveBeenCalled();
  await act(async () => {
    field.focus();
    field.value = "Marques Brownlee";
    field.blur();
  });
  expect(host.querySelector('[role="alert"]')?.textContent).toContain(
    "Couldn't save",
  );
  expect(field.value).toBe("Marques Brownlee");
  expect(field.disabled).toBe(false);
  await act(async () => {
    field.focus();
    field.blur();
  });
  expect(save).toHaveBeenLastCalledWith("Marques Brownlee");
  expect(host.querySelector('[role="alert"]')).toBeNull();
  expect(host.querySelector('[role="status"]')).toBeNull();
  await act(async () => {
    field.focus();
    field.blur();
  });
  expect(save).toHaveBeenCalledTimes(2);
});
