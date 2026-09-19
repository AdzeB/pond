import { act, type ComponentProps } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { WatchTargetForm } from "./";

type FormProps = ComponentProps<typeof WatchTargetForm>;
let root: Root;
let host: HTMLDivElement;
const addWatch = vi.fn<FormProps["addWatch"]>();
const onAdded = vi.fn<FormProps["onAdded"]>();

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
  }));
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  addWatch
    .mockReset()
    .mockResolvedValue({ ok: true, watch: { id: "watch-1" } });
  onAdded.mockReset();
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function render(
  resolveTarget: FormProps["resolveTarget"],
  source: FormProps["source"] = "youtube",
  connectedSources: FormProps["connectedSources"] = [],
) {
  await act(async () =>
    root.render(
      <WatchTargetForm
        source={source}
        connectedSources={connectedSources}
        resolveTarget={resolveTarget}
        addWatch={addWatch}
        onAdded={onAdded}
      />,
    ),
  );
}

async function typeInput(value: string) {
  const field = host.querySelector('input[type="text"]');
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set?.call(field, value);
    field?.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await act(async () => vi.advanceTimersByTimeAsync(500));
}

function account(platform: string) {
  const input = Array.from(
    host.querySelectorAll<HTMLButtonElement>(
      "button[aria-label]:not([data-icon])",
    ),
  ).find((input) =>
    input.getAttribute("aria-label")?.startsWith(`${platform}:`),
  );
  if (!input) throw new Error(`Missing option: ${platform}`);
  return input;
}

it("resolves the chosen source and submits only after a click", async () => {
  const resolve = vi.fn<FormProps["resolveTarget"]>(async (_source, input) => ({
    handle: input,
    display: `@${input}`,
    kind: "user",
  }));
  await render(resolve);
  await typeInput("drumarjohnson");
  expect(host.querySelector("select")).toBeNull();
  expect(
    host.querySelectorAll("button[aria-label]:not([data-icon])"),
  ).toHaveLength(1);
  expect(addWatch).not.toHaveBeenCalled();
  await act(async () => account("YouTube").click());

  expect(addWatch).toHaveBeenCalledExactlyOnceWith("youtube", "drumarjohnson");
  expect(onAdded).toHaveBeenCalledWith("watch-1");
});

it("blocks Instagram watches until that account is connected", async () => {
  const resolve = vi.fn<FormProps["resolveTarget"]>(async (_source, input) => ({
    handle: input,
    display: `@${input}`,
    kind: "user",
  }));
  await render(resolve, "instagram");
  await typeInput("drumarjohnson");
  expect(account("Instagram").disabled).toBe(true);
  expect(host.textContent).not.toContain("Connect your Instagram account");
  expect(
    host.querySelector(
      'button[aria-label^="Connect your Instagram account in Sources"]',
    ),
  ).not.toBeNull();
  expect(addWatch).not.toHaveBeenCalled();
});

it("rejects a link from another source", async () => {
  await render(
    async () => ({ handle: "alice", display: "@alice" }),
    "instagram",
  );
  await typeInput("https://youtube.com/@alice");
  expect(host.textContent).toContain("This link isn't from Instagram.");
  expect(addWatch).not.toHaveBeenCalled();
});

it("resolves a full link and waits for the user to click before starting", async () => {
  const resolve = vi.fn<FormProps["resolveTarget"]>(async () => ({
    handle: "alice",
    display: "@alice",
    kind: "channel",
  }));
  await render(resolve);
  await typeInput("https://youtube.com/@alice");
  expect(resolve).toHaveBeenCalledExactlyOnceWith(
    "youtube",
    "https://youtube.com/@alice",
  );
  expect(addWatch).not.toHaveBeenCalled();
  await act(async () => account("YouTube").click());
  expect(addWatch).toHaveBeenCalledExactlyOnceWith(
    "youtube",
    "https://youtube.com/@alice",
  );
});

it("waits for the chosen source before showing a result", async () => {
  let finish: () => void = () => {};
  const pending = new Promise<null>((resolve) => {
    finish = () => resolve(null);
  });
  await render(() => pending);
  await typeInput("alice");
  expect(
    host.querySelectorAll("button[aria-label]:not([data-icon])"),
  ).toHaveLength(0);
  const loading = host.querySelector(
    '[role="status"][aria-label="Looking for accounts"]',
  );
  expect(loading?.children).toHaveLength(1);
  expect(host.textContent).not.toContain("Looking for accounts");
  await act(async () => finish());
  expect(
    host.querySelectorAll("button[aria-label]:not([data-icon])"),
  ).toHaveLength(0);
  expect(host.querySelector('[aria-label="Looking for accounts"]')).toBeNull();
  expect(host.textContent).toContain(
    "Couldn't find anything. Try another search.",
  );
  expect(addWatch).not.toHaveBeenCalled();
});

it("ignores responses for the previous handle", async () => {
  let finish: (value: Awaited<ReturnType<FormProps["resolveTarget"]>>) => void =
    () => {};
  const oldResult = new Promise<
    Awaited<ReturnType<FormProps["resolveTarget"]>>
  >((resolve) => {
    finish = resolve;
  });
  await render(async (_source, input) =>
    input === "old" ? oldResult : { handle: input, display: `@${input}` },
  );
  await typeInput("old");
  await typeInput("new");
  await act(async () => finish({ handle: "old", display: "@old" }));
  expect(host.textContent).not.toContain("@old");
  expect(account("YouTube").disabled).toBe(false);
  await typeInput("third");
  expect(account("YouTube").getAttribute("aria-label")).toContain("third");
  expect(addWatch).not.toHaveBeenCalled();
});

it("hides missing accounts and shows an empty result when none exist", async () => {
  await render(async () => null);
  await typeInput("missing-account");
  expect(
    host.querySelectorAll("button[aria-label]:not([data-icon])"),
  ).toHaveLength(0);
  expect(host.textContent).toContain(
    "Couldn't find anything. Try another search.",
  );
  expect(addWatch).not.toHaveBeenCalled();
});

it("reports failed lookups without inventing matches", async () => {
  await render(async () => {
    throw new Error("Rate limited");
  });
  await typeInput("alice");
  expect(
    host.querySelectorAll("button[aria-label]:not([data-icon])"),
  ).toHaveLength(0);
  expect(host.textContent).toContain(
    "Couldn't find anything. Try another search.",
  );
});

it("shows the profile photo and handle, with a platform fallback if the photo fails", async () => {
  await render(async (_source, input) => ({
    handle: input,
    display: "Alice Example",
    avatarUrl: `https://example.com/${input}.jpg`,
  }));
  await typeInput("https://youtube.com/@alice");
  const photo = host.querySelector<HTMLImageElement>(
    'img[src^="https://example.com/"]',
  );
  expect(photo).not.toBeNull();
  expect(host.textContent).toContain("Alice Example");
  expect(host.textContent).toContain("@alice");
  await act(async () => photo?.dispatchEvent(new Event("error")));
  expect(host.querySelector('img[src^="https://example.com/"]')).toBeNull();
  expect(account("YouTube").disabled).toBe(false);
});

it("prevents duplicate starts and lets the user retry after a failure", async () => {
  let fail: (error: Error) => void = () => {};
  addWatch.mockImplementationOnce(
    () =>
      new Promise((_resolve, reject) => {
        fail = reject;
      }),
  );
  await render(async (_source, input) => ({ handle: input, display: input }));
  await typeInput("alice");
  expect(host.textContent).not.toContain("Start Watching");
  await act(async () => {
    account("YouTube").click();
    account("YouTube").click();
  });
  expect(addWatch).toHaveBeenCalledTimes(1);
  expect(account("YouTube").disabled).toBe(true);
  expect(host.textContent).toContain("Starting");
  await act(async () => fail(new Error("Unavailable")));
  expect(host.querySelector('[role="alert"]')).not.toBeNull();
  await act(async () => account("YouTube").click());
  expect(addWatch).toHaveBeenCalledTimes(2);
  expect(onAdded).toHaveBeenCalledWith("watch-1");
});

it("never renders an empty result between typing and starting the lookup", async () => {
  await render(() => new Promise(() => {}));
  const flashes: string[] = [];
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        const text = node.textContent ?? "";
        if (
          text.includes("No accounts found") ||
          text.includes("Couldn't find anything")
        )
          flashes.push(text);
      }
    }
  });
  observer.observe(host, { childList: true, subtree: true });
  try {
    await typeInput("a");
    await typeInput("alice");
    expect(flashes).toEqual([]);
    expect(
      host.querySelector('[aria-label="Looking for accounts"]'),
    ).not.toBeNull();
  } finally {
    observer.disconnect();
  }
});
