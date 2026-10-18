import { Dialog } from "@pond/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
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

function actionButton(name: string) {
  return host.querySelector(`button[aria-label="${name}"]`);
}

it.each([
  ["loading", "Loading source details"],
  ["missing", "This source is unavailable."],
] as const)("shows the %s state without details", async (status, copy) => {
  await act(async () => {
    root.render(<SourceInspectorView status={status} />);
  });
  expect(host.querySelector('[role="status"]')?.textContent).toBe(copy);
  expect(nicknameField()).toBeNull();
});

function nicknameField() {
  return host.querySelector('input[aria-label="Nickname"]');
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
  expect(done).toBeUndefined();
});

it("switches pages from the sidebar", async () => {
  await act(async () => {
    root.render(
      <SourceInspectorView
        status="ready"
        handle="@raphaelsalaja"
        source="twitter"
        pages={[
          {
            id: "import",
            label: "Import",
            icon: null,
            description: "Nothing else from X reaches your library.",
            content: <p>Import choices</p>,
          },
        ]}
        initialPage="import"
        onNicknameSave={async () => {}}
      />,
    );
  });
  const nav = host.querySelector('[aria-label="Pages"]');
  const pages = Array.from(nav?.querySelectorAll("button") ?? []);
  expect(pages.map((page) => page.textContent)).toEqual(["General", "Import"]);
  expect(host.querySelector("h1")?.textContent).toBe("Import");
  expect(host.textContent).toContain("Import choices");
  expect(nicknameField()).toBeNull();

  await act(async () => pages[0]?.click());
  expect(host.querySelector("h1")?.textContent).toBe("General");
  expect(nicknameField()).toBeInstanceOf(HTMLInputElement);
  expect(host.textContent).not.toContain("Import choices");
  expect(pages[0]?.getAttribute("aria-current")).toBe("page");
});

it("lays out source actions as rows on General", async () => {
  const onCopy = vi.fn();
  const onDisconnect = vi.fn();
  await act(async () => {
    root.render(
      <SourceInspectorView
        status="ready"
        handle="@raphael-salaja"
        source="arena"
        nickname="Are.na"
        actions={{
          kind: "Profile",
          profile: [
            {
              id: "identity",
              title: "Username",
              value: "raphael-salaja",
              actions: [
                { label: "Copy", name: "Copy Username", onClick: onCopy },
              ],
            },
          ],
          fetch: [],
          connection: [
            {
              id: "remove",
              title: "Disconnect Are.na",
              actions: [
                {
                  label: "Disconnect",
                  variant: "destructive",
                  onClick: onDisconnect,
                },
              ],
            },
          ],
        }}
        onNicknameSave={async () => {}}
      />,
    );
  });
  const field = nicknameField();
  if (!(field instanceof HTMLInputElement))
    throw new Error("Missing nickname field");
  expect(field.value).toBe("Are.na");
  const titles = Array.from(host.querySelectorAll("h3")).map(
    (title) => title.textContent,
  );
  expect(titles).toEqual(["Nickname", "Username", "Disconnect Are.na"]);
  expect(host.textContent).toContain("Profile");
  expect(host.textContent).toContain("Connection");
  const copy = actionButton("Copy Username");
  if (!(copy instanceof HTMLElement)) throw new Error("Missing Copy Username");
  await act(async () => copy.click());
  expect(onCopy).toHaveBeenCalledOnce();
});

it("dims a disabled action row without hiding it", async () => {
  const onFetch = vi.fn();
  await act(async () => {
    root.render(
      <SourceInspectorView
        status="ready"
        source="twitter"
        actions={{
          kind: "Profile",
          profile: [
            {
              id: "older",
              title: "Fetch Older Saves",
              disabled: true,
              actions: [
                { label: "Fetch", name: "Fetch Older Saves", onClick: onFetch },
              ],
            },
          ],
          fetch: [],
          connection: [],
        }}
      />,
    );
  });
  const fetch = actionButton("Fetch Older Saves");
  if (!(fetch instanceof HTMLButtonElement))
    throw new Error("Missing Fetch Older Saves");
  expect(fetch.disabled).toBe(true);
  expect(fetch.closest("[data-disabled]")).toBeTruthy();
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

it("shows watch properties", async () => {
  await act(async () => {
    root.render(
      <SourceInspectorView
        status="ready"
        source="youtube"
        properties={[
          { label: "Source", value: "YouTube" },
          { label: "Type", value: "Playlist" },
          { label: "Saved Items", value: "42" },
          { label: "Connected Via", value: "@pond" },
        ]}
      />,
    );
  });
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
  expect(actionButton("Change Folder")).toBeTruthy();
  expect(actionButton("Pause Watching")).toBeTruthy();
  expect(host.textContent).toContain("Stop Watching");
  client.clear();
});
