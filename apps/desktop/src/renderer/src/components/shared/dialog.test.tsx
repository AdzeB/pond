// @vitest-environment jsdom
import { Dialog, PageDialog } from "@pond/ui";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import dialogStyles from "../../../../../../../packages/ui/src/shared/styles/dialog/styles.module.css";
import { ConfirmDialogHost, confirm } from "./confirm-dialog";
import { PromptDialogHost, prompt } from "./prompt-dialog";

let root: Root;
let host: HTMLDivElement;
const observers: {
  target?: Element;
  disconnected: boolean;
  callback: () => void;
}[] = [];

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal(
    "ResizeObserver",
    class {
      record: (typeof observers)[number];
      constructor(callback: () => void) {
        this.record = { callback, disconnected: false };
        observers.push(this.record);
      }
      observe(target: Element) {
        this.record.target = target;
      }
      unobserve() {}
      disconnect() {
        this.record.disconnected = true;
      }
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
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  observers.length = 0;
  vi.unstubAllGlobals();
});

function button(label: string) {
  const found = Array.from(document.querySelectorAll("button")).find(
    (element) =>
      element.textContent === label ||
      element.getAttribute("aria-label") === label,
  );
  if (!found) throw new Error(`Missing button: ${label}`);
  return found;
}

it("preserves shared layout classes when a caller adds its own class", async () => {
  await act(async () =>
    root.render(
      <>
        <Dialog.Header
          className="custom-header"
          leading={<button type="button">Back</button>}
          trailing={<button type="button">Close</button>}
        >
          <h2>Title</h2>
          <p>Description</p>
        </Dialog.Header>
        <Dialog.Content className="custom-content">Content</Dialog.Content>
        <Dialog.Footer className="custom-footer">Footer</Dialog.Footer>
      </>,
    ),
  );
  expect(host.querySelector(".custom-header")?.className.split(" ")).toContain(
    dialogStyles.header,
  );
  expect(host.querySelector(".custom-content")?.className.split(" ")).toContain(
    dialogStyles.content,
  );
  expect(host.querySelector(".custom-footer")?.className.split(" ")).toContain(
    dialogStyles.footer,
  );
  expect(
    [...host.querySelectorAll("button")].map((element) => element.textContent),
  ).toEqual(["Back", "Close"]);
});

it("renders prompt inputs inside their styled root with an accessible name", async () => {
  await act(async () => root.render(<PromptDialogHost />));
  await act(async () =>
    prompt({
      title: "Rename Folder",
      confirmLabel: "Rename",
      initialValue: "Ideas",
      onConfirm: vi.fn(),
    }),
  );
  const input = document.querySelector("input");
  expect(input?.parentElement?.dataset.slot).toBe("root");
  expect(input?.getAttribute("aria-labelledby")).toBeTruthy();
  expect(input?.value).toBe("Ideas");
});

it("uses medium-sized page dialog actions", async () => {
  await act(async () =>
    root.render(
      <PageDialog.Footer>
        <PageDialog.Cancel />
        <PageDialog.Confirm />
      </PageDialog.Footer>,
    ),
  );
  expect(button("Cancel").dataset.size).toBe("md");
  expect(button("Confirm").dataset.size).toBe("md");
});

it("keeps a prompt open and blocks duplicate submissions while saving", async () => {
  let finish = () => {};
  const onConfirm = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  await act(async () => root.render(<PromptDialogHost />));
  await act(async () =>
    prompt({ title: "Rename Folder", confirmLabel: "Rename", onConfirm }),
  );
  const submit = button("Rename");
  await act(async () => {
    submit.click();
    submit.click();
  });
  expect(onConfirm).toHaveBeenCalledTimes(1);
  expect(
    document.querySelector('[role="dialog"]')?.hasAttribute("data-open"),
  ).toBe(true);
  expect(button("Cancel").disabled).toBe(true);
  await act(async () => finish());
  expect(document.querySelector('[role="dialog"][data-open]')).toBeNull();
});

it("focuses the safe confirmation action before a destructive action", async () => {
  await act(async () => root.render(<ConfirmDialogHost />));
  await act(async () =>
    confirm({
      title: "Remove Folder",
      confirmLabel: "Remove",
      onConfirm: vi.fn(),
    }),
  );
  await act(
    async () =>
      new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
  );
  expect(document.activeElement).toBe(button("Cancel"));
});

it("preserves prompt values after failure and supports retry", async () => {
  const onConfirm = vi
    .fn()
    .mockRejectedValueOnce(new Error("Couldn't rename. Try again."))
    .mockResolvedValueOnce(undefined);
  await act(async () => root.render(<PromptDialogHost />));
  await act(async () =>
    prompt({
      title: "Rename Folder",
      confirmLabel: "Rename",
      initialValue: "Ideas",
      onConfirm,
    }),
  );
  await act(async () => button("Rename").click());
  expect(document.querySelector('[role="alert"]')?.textContent).toBe(
    "Couldn't rename. Try again.",
  );
  expect(document.querySelector("input")?.value).toBe("Ideas");
  expect(document.querySelector('[role="dialog"][data-open]')).not.toBeNull();
  await act(async () => button("Rename").click());
  expect(onConfirm).toHaveBeenNthCalledWith(2, "Ideas");
  expect(document.querySelector('[role="dialog"][data-open]')).toBeNull();
});

it("resets a prompt when it is reopened with another payload", async () => {
  await act(async () => root.render(<PromptDialogHost />));
  await act(async () =>
    prompt({
      title: "Rename Folder",
      confirmLabel: "Rename",
      initialValue: "First",
      onConfirm: vi.fn(),
    }),
  );
  await act(async () => button("Cancel").click());
  await act(async () =>
    prompt({
      title: "Rename Folder",
      confirmLabel: "Rename",
      initialValue: "Second",
      onConfirm: vi.fn(),
    }),
  );
  expect(document.querySelector("input")?.value).toBe("Second");
});

it("handles confirmation failures without dismissing the dialog", async () => {
  const onConfirm = vi
    .fn()
    .mockRejectedValueOnce(new Error("Couldn't remove. Try again."))
    .mockResolvedValueOnce(undefined);
  await act(async () => root.render(<ConfirmDialogHost />));
  await act(async () =>
    confirm({ title: "Remove Folder", confirmLabel: "Remove", onConfirm }),
  );
  await act(async () => button("Remove").click());
  expect(document.querySelector('[role="alert"]')?.textContent).toBe(
    "Couldn't remove. Try again.",
  );
  expect(
    document.querySelector('[role="alertdialog"][data-open]'),
  ).not.toBeNull();
  await act(async () => button("Remove").click());
  expect(document.querySelector('[role="alertdialog"][data-open]')).toBeNull();
});

it("blocks duplicate confirmations and Escape while an action is pending", async () => {
  let finish = () => {};
  const onConfirm = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  await act(async () => root.render(<ConfirmDialogHost />));
  await act(async () =>
    confirm({ title: "Remove Folder", confirmLabel: "Remove", onConfirm }),
  );
  const submit = button("Remove");
  await act(async () => {
    submit.click();
    submit.click();
  });
  await act(async () =>
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    ),
  );
  expect(onConfirm).toHaveBeenCalledTimes(1);
  expect(
    document.querySelector('[role="alertdialog"][data-open]'),
  ).not.toBeNull();
  expect(button("Cancel").disabled).toBe(true);
  await act(async () => finish());
  expect(document.querySelector('[role="alertdialog"][data-open]')).toBeNull();
});

function Pages({ page }: { page: number }) {
  return (
    <PageDialog.Root open>
      <PageDialog.Portal>
        <PageDialog.Popup pageId={String(page)} depth={page}>
          <PageDialog.Header>
            <PageDialog.Title>Step {page}</PageDialog.Title>
            <PageDialog.Close />
          </PageDialog.Header>
          <PageDialog.Viewport>
            <button type="button">Page {page}</button>
          </PageDialog.Viewport>
        </PageDialog.Popup>
      </PageDialog.Portal>
    </PageDialog.Root>
  );
}

it("keeps measuring the active page after the outgoing page unmounts", async () => {
  await act(async () => root.render(<Pages page={0} />));
  await act(async () => root.render(<Pages page={1} />));
  await act(async () => new Promise((resolve) => setTimeout(resolve, 350)));
  const active = observers.filter(
    (observer) =>
      observer.target?.textContent === "Page 1" && !observer.disconnected,
  );
  expect(active).toHaveLength(1);
  const page = active[0]?.target;
  if (!page) throw new Error("Missing active page observer");
  Object.defineProperty(page, "offsetHeight", {
    configurable: true,
    value: 300,
  });
  await act(async () => active[0]?.callback());
  expect(
    document
      .querySelector<HTMLElement>('[role="dialog"]')
      ?.style.getPropertyValue("--height"),
  ).toBe("364px");
  expect(
    observers.filter(
      (observer) =>
        observer.target?.textContent === "Page 0" && !observer.disconnected,
    ),
  ).toHaveLength(0);
});

it("uses native keyboard semantics for the page close button", async () => {
  await act(async () => root.render(<Pages page={0} />));
  expect(button("Close").getAttribute("role")).not.toBe("button");
  expect(button("Close").type).toBe("button");
});
