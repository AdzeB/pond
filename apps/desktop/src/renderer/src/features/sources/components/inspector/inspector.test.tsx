import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cardModel } from "@/features/sources/components/sync-monitor/lib/helpers";
import type { SyncSourceStatus } from "@/features/sources/state/sync-monitor";
import { SourceInspectorView } from "./index";

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  });
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
      unobserve() {}
    },
  );
  Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
    configurable: true,
    get() {
      return 240;
    },
  });
  Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
    configurable: true,
    get() {
      return 280;
    },
  });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

async function openActions(label = "Source Actions") {
  const trigger = host.querySelector(`[aria-label="${label}"]`);
  if (!(trigger instanceof HTMLElement)) throw new Error(`Missing ${label}`);
  await act(async () => {
    trigger.click();
  });
}

function menuItem(label: string) {
  return Array.from(document.querySelectorAll('[role="menuitem"]')).find(
    (item) => item.textContent === label,
  );
}

it("uses the handle as the identity name instead of the source", async () => {
  await act(async () => {
    root.render(
      <SourceInspectorView
        handle="@oluwa.rafa"
        source="instagram"
        nickname=""
        onClose={() => {}}
        onNicknameSave={async () => {}}
      />,
    );
  });
  const field = host.querySelector('input[aria-label="Nickname"]');
  if (!(field instanceof HTMLInputElement))
    throw new Error("Missing nickname field");
  expect(field.value).toBe("");
  expect(field.placeholder).toBe("@oluwa.rafa");
  expect(field.closest("div")?.textContent).not.toContain("Instagram");
});

it("flattens connection details instead of nesting profile pages", async () => {
  const onFetch = vi.fn();
  const status: SyncSourceStatus = {
    source: "arena",
    state: "idle",
    lastSyncedAt: "2026-09-17T12:00:00.000Z",
    lastError: null,
    connected: true,
  };
  await act(async () => {
    root.render(
      <SourceInspectorView
        handle="@raphael-salaja"
        source="arena"
        model={cardModel(status)}
        syncStatus={status}
        nickname="Are.na"
        properties={[
          { label: "Source", value: "Are.na" },
          { label: "Type", value: "Account" },
          { label: "Saved Items", value: "1,248" },
        ]}
        menuItems={[
          {
            type: "group",
            label: "Fetch",
            items: [
              { label: "Fetch New Saves", onClick: onFetch },
              { label: "Fetch Older Saves", onClick: () => {} },
            ],
          },
          { type: "separator" },
          {
            type: "group",
            label: "Connection",
            items: [{ label: "Disconnect Are.na", onClick: () => {} }],
          },
        ]}
        onClose={() => {}}
        onFetch={onFetch}
        onNicknameSave={async () => {}}
      />,
    );
  });
  const field = host.querySelector('input[aria-label="Nickname"]');
  if (!(field instanceof HTMLInputElement))
    throw new Error("Missing nickname field");
  expect(field.value).toBe("Are.na");
  expect(host.textContent).toContain("@raphael-salaja");
  expect(host.textContent).not.toContain("Profile");
  expect(host.textContent).not.toContain("Options");
  expect(host.textContent).not.toContain("Maintenance");
  expect(host.textContent).toContain("Activity");
  expect(host.textContent).toContain("Properties");
  expect(host.textContent).toContain("Saved Items");
  const panelText = host.textContent ?? "";
  expect(panelText.indexOf("Properties")).toBeLessThan(
    panelText.indexOf("Activity"),
  );
  await openActions();
  expect(document.body.textContent).toContain("Fetch");
  expect(document.body.textContent).toContain("Connection");
  expect(menuItem("Fetch New Saves")).toBeTruthy();
  expect(menuItem("Fetch Older Saves")).toBeTruthy();
  expect(menuItem("Disconnect Are.na")).toBeTruthy();
  const fetch = menuItem("Fetch New Saves");
  if (!(fetch instanceof HTMLElement))
    throw new Error("Missing Fetch New Saves");
  await act(async () => {
    fetch.click();
  });
  expect(onFetch).toHaveBeenCalledOnce();
});

it("keeps a failed nickname edit available and retries it on the next blur", async () => {
  const save = vi
    .fn<(value: string) => Promise<void>>()
    .mockRejectedValueOnce(new Error("Offline"))
    .mockResolvedValueOnce();
  await act(async () => {
    root.render(
      <SourceInspectorView
        source="arena"
        nickname="Alex"
        onClose={() => {}}
        onNicknameSave={save}
      />,
    );
  });
  const field = host.querySelector("input");
  if (!field) throw new Error("Missing nickname field");
  expect(field.getAttribute("aria-label")).toBe("Nickname");
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
  await act(async () => {
    field.focus();
    field.blur();
  });
  expect(save).toHaveBeenCalledTimes(2);
});

it("shows live fetch progress and cancels the active fetch", async () => {
  const onCancel = vi.fn();
  const status: SyncSourceStatus = {
    source: "twitter",
    state: "running",
    message: "Queueing",
    progress: { current: 3, total: 12 },
    lastSyncedAt: "2026-09-17T12:00:00.000Z",
    lastError: null,
    connected: true,
  };
  await act(async () => {
    root.render(
      <SourceInspectorView
        source="twitter"
        model={cardModel(status)}
        syncStatus={status}
        onCancel={onCancel}
        onClose={() => {}}
      />,
    );
  });
  expect(host.textContent).toContain("Queueing");
  expect(host.textContent).toContain("3 of 12 saves");
  expect(host.textContent).toContain("25%");
  expect(host.querySelector('[aria-label="Current source status"]')).toBeNull();
  expect(
    host.querySelector('progress[aria-label="Fetch progress"]'),
  ).not.toBeNull();
  const cancel = Array.from(host.querySelectorAll("button")).find(
    (button) => button.textContent === "Cancel Fetch",
  );
  if (!(cancel instanceof HTMLButtonElement))
    throw new Error("Missing Cancel Fetch");
  await act(async () => cancel.click());
  expect(onCancel).toHaveBeenCalledOnce();
});

it("offers sign-in recovery when authentication expires", async () => {
  const onSignIn = vi.fn();
  const status: SyncSourceStatus = {
    source: "instagram",
    state: "auth_required",
    message: "Sign in to Instagram to keep fetching saves.",
    lastSyncedAt: null,
    lastError: "auth_required",
    connected: true,
  };
  await act(async () => {
    root.render(
      <SourceInspectorView
        source="instagram"
        model={cardModel(status)}
        syncStatus={status}
        onSignIn={onSignIn}
        onClose={() => {}}
      />,
    );
  });
  expect(host.textContent).toContain(
    "Sign in to Instagram to keep fetching saves.",
  );
  const signIn = Array.from(host.querySelectorAll("button")).find(
    (button) => button.textContent === "Sign In Again",
  );
  if (!(signIn instanceof HTMLButtonElement))
    throw new Error("Missing Sign In Again");
  await act(async () => signIn.click());
  expect(onSignIn).toHaveBeenCalledOnce();
});

it("shows watch properties and retries a failed fetch", async () => {
  const onFetch = vi.fn();
  const status: SyncSourceStatus = {
    source: "youtube",
    state: "error",
    message: "Couldn't read this playlist. Try again.",
    lastSyncedAt: null,
    lastError: "playlist_unavailable",
    connected: true,
  };
  await act(async () => {
    root.render(
      <SourceInspectorView
        source="youtube"
        model={cardModel(status)}
        syncStatus={status}
        properties={[
          { label: "Source", value: "YouTube" },
          { label: "Type", value: "Playlist" },
          { label: "Saved Items", value: "42" },
          { label: "Connected Via", value: "@pond" },
        ]}
        onFetch={onFetch}
        onClose={() => {}}
      />,
    );
  });
  expect(host.textContent).toContain("Couldn't read this playlist. Try again.");
  expect(host.textContent).toContain("Playlist");
  expect(host.textContent).toContain("Connected Via");
  const retry = Array.from(host.querySelectorAll("button")).find(
    (button) => button.textContent === "Retry Fetch",
  );
  if (!(retry instanceof HTMLButtonElement))
    throw new Error("Missing Retry Fetch");
  await act(async () => retry.click());
  expect(onFetch).toHaveBeenCalledOnce();
});
