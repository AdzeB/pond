// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { notify, toastManager } from "@/shared/lib/toast";
import { ToastHost } from "./toast-host";

let root: Root;
let host: HTMLDivElement;

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  toastManager.close();
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

it("renders toasts at the app root", async () => {
  await act(async () => root.render(<ToastHost />));

  await act(async () => {
    notify({ id: "copied", title: "Copied to clipboard" });
  });

  const viewport = document.body.querySelector("[data-slot='toasts']");
  expect(viewport?.textContent).toContain("Copied to clipboard");
  expect(host.contains(viewport)).toBe(false);
});
