import { Dialog } from "@pond/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cardModel } from "@/features/sources/components/sync-monitor/lib/helpers";
import type { SyncSourceStatus } from "@/features/sources/state/sync-monitor";
import { SourceInspector, SourceInspectorView } from "./index";

interface TestRoot {
  render(node: ReactNode): void;
  unmount(): void;
}

let host: HTMLDivElement;
let root: TestRoot;

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
  const base = createRoot(host);
  root = {
    render: (node) =>
      base.render(
        <Dialog.Root open>
          <Dialog.Portal container={host}>
            <Dialog.Popup>{node}</Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>,
      ),
    unmount: () => base.unmount(),
  };
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

it.each([
  ["loading", "Loading source details"],
  ["missing", "This source is unavailable."],
] as const)(
  "shows the %s state without source actions",
  async (status, copy) => {
    await act(async () => {
      root.render(<SourceInspectorView status={status} />);
    });
    expect(host.querySelector('[role="status"]')?.textContent).toBe(copy);
    expect(host.querySelector('[aria-label="Source Actions"]')).toBeNull();
    expect(nicknameField()).toBeNull();
  },
);

function nicknameField() {
  const label = Array.from(host.querySelectorAll("label")).find(
    (node) => node.textContent === "Nickname",
  );
  return label?.htmlFor ? document.getElementById(label.htmlFor) : null;
}

it("centers the handle and suggests it as the nickname", async () => {
  await act(async () => {
    root.render(
      <SourceInspectorView
        status="ready"
        handle="@oluwa.rafa"
        description="Last fetched 1 day ago"
        source="instagram"
        nickname=""
        onNicknameSave={async () => {}}
      />,
    );
  });
  const field = nicknameField();
  if (!(field instanceof HTMLInputElement))
    throw new Error("Missing nickname field");
  expect(field.value).toBe("");
  expect(field.placeholder).toBe("@oluwa.rafa");
  expect(host.querySelector("h2")?.textContent).toBe("@oluwa.rafa");
  expect(host.textContent).toContain("Last fetched 1 day ago");
  const done = Array.from(host.querySelectorAll("button")).find(
    (button) => button.textContent === "Done",
  );
  expect(done).toBeDefined();
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
        status="ready"
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
        onNicknameSave={async () => {}}
      />,
    );
  });
  const field = nicknameField();
  if (!(field instanceof HTMLInputElement))
    throw new Error("Missing nickname field");
  expect(field.value).toBe("Are.na");
  expect(host.textContent).toContain("@raphael-salaja");
  expect(host.textContent).not.toContain("Profile");
  expect(host.textContent).not.toContain("Options");
  expect(host.textContent).not.toContain("Maintenance");
  expect(host.textContent).not.toContain("Activity");
  expect(host.textContent).toContain("Properties");
  expect(host.textContent).toContain("Saved Items");
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
        status="ready"
        source="arena"
        nickname="Alex"
        onNicknameSave={save}
      />,
    );
  });
  const field = nicknameField();
  if (!(field instanceof HTMLInputElement))
    throw new Error("Missing nickname field");
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

it("shows live fetch progress without an inline action", async () => {
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
        status="ready"
        source="twitter"
        model={cardModel(status)}
        syncStatus={status}
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
  expect(host.textContent).not.toContain("Cancel Fetch");
});

it("explains expired authentication", async () => {
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
        status="ready"
        source="instagram"
        model={cardModel(status)}
        syncStatus={status}
      />,
    );
  });
  expect(host.textContent).toContain(
    "Sign in to Instagram to keep fetching saves.",
  );
});

it("shows watch properties and the fetch error", async () => {
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
        status="ready"
        source="youtube"
        model={cardModel(status)}
        syncStatus={status}
        properties={[
          { label: "Source", value: "YouTube" },
          { label: "Type", value: "Playlist" },
          { label: "Saved Items", value: "42" },
          { label: "Connected Via", value: "@pond" },
        ]}
      />,
    );
  });
  expect(host.textContent).toContain("Couldn't read this playlist. Try again.");
  expect(host.textContent).toContain("Playlist");
  expect(host.textContent).toContain("Connected Via");
});

it("shows watched folder details with its folder actions", async () => {
  vi.stubGlobal("pond", {
    query: async (name: string) => {
      if (name === "autoImport.status")
        return {
          enabled: true,
          path: "/Users/me/Inbox",
          mode: "copy",
          history: [{ at: Date.now(), name: "a.png", mode: "copy", ok: true }],
        };
      throw new Error(name);
    },
  });
  const client = new QueryClient();
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <SourceInspector kind="folder" id="/Users/me/Inbox" />
      </QueryClientProvider>,
    );
  });
  await act(async () => {
    await vi.waitFor(() =>
      expect(host.querySelector("h2")?.textContent).toBe("Inbox"),
    );
  });
  expect(host.textContent).toContain("Last imported");
  expect(host.textContent).toContain("/Users/me/Inbox");
  expect(host.textContent).toContain("Watching");
  expect(nicknameField()).toBeNull();
  await openActions();
  expect(menuItem("Pause Watching")).toBeTruthy();
  expect(menuItem("Stop Watching")).toBeTruthy();
  client.clear();
});
