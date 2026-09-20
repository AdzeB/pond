import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { LockScreen } from ".";

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
  vi.restoreAllMocks();
});

it("unlocks with the entered password", async () => {
  const query = vi.fn().mockResolvedValue({ ok: true });
  Object.defineProperty(window, "pond", {
    configurable: true,
    value: { query },
  });
  const onUnlocked = vi.fn();

  await act(async () => {
    root.render(
      <LockScreen
        status={{
          configured: true,
          state: "locked",
          biometricSupported: false,
          biometricAvailable: false,
          recoveryAvailable: true,
        }}
        onUnlocked={onUnlocked}
      />,
    );
  });

  const input = host.querySelector<HTMLInputElement>("input");
  const form = host.querySelector<HTMLFormElement>("form");
  if (!input || !form) throw new Error("Missing lock controls");
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set?.call(input, "password");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await act(async () => {
    form.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );
  });

  expect(query).toHaveBeenCalledWith("security.unlock", {
    password: "password",
  });
  expect(onUnlocked).toHaveBeenCalledOnce();
});
