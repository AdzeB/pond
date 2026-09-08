// @vitest-environment jsdom
import { Button, Combobox } from "@pond/ui";
import { MotionConfig } from "motion/react";
import { act, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ComposerTray, type ComposerTrayView } from "./composer-tray";

let host: HTMLDivElement;
let root: Root;

function Harness() {
  const anchorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [view, setView] = useState<ComposerTrayView | null>(null);
  const [draft, setDraft] = useState("");
  const [model, setModel] = useState<string | null>(null);
  return (
    <MotionConfig reducedMotion="always">
      <div ref={anchorRef}>
        <textarea
          ref={inputRef}
          aria-label="Message Agent"
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            setView(event.target.value.includes("@") ? "suggestions" : null);
          }}
        />
        {(["add", "models", "context"] satisfies ComposerTrayView[]).map(
          (next) => (
            <Button
              key={next}
              data-composer-tray-trigger
              onClick={() => setView(next)}
            >
              Open {next}
            </Button>
          ),
        )}
      </div>
      <ComposerTray
        view={view}
        anchorRef={anchorRef}
        inputRef={inputRef}
        onClose={() => setView(null)}
        onBack={() => setView("add")}
        render={(current) =>
          current === "models" ? (
            <Combobox.Root<string>
              inline
              open
              items={["Local model", "Cloud model"]}
              value={model}
              onValueChange={setModel}
            >
              <Combobox.Input aria-label="Search models" />
              <Combobox.List aria-label="Models">
                {(item: string) => (
                  <Combobox.Item key={item} value={item}>
                    <Combobox.ItemLabel>{item}</Combobox.ItemLabel>
                  </Combobox.Item>
                )}
              </Combobox.List>
            </Combobox.Root>
          ) : current === "context" ? (
            <input aria-label="Search Saves" placeholder="Search Saves" />
          ) : current === "suggestions" ? (
            <div role="listbox" aria-label="Suggested Saves">
              <div role="option" aria-selected="false" tabIndex={-1}>
                A saved film
              </div>
            </div>
          ) : (
            <Button onClick={() => setView("context")}>Add Saves</Button>
          )
        }
      />
      <output>{model}</output>
    </MotionConfig>
  );
}

async function settle() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(100);
  });
}
async function click(label: string) {
  const button = [...document.querySelectorAll("button")].find(
    (element) =>
      element.textContent === label ||
      element.getAttribute("aria-label") === label,
  );
  if (!button) throw new Error(`Missing button: ${label}`);
  await act(async () => {
    button.dispatchEvent(
      new MouseEvent("pointerdown", { bubbles: true, button: 0 }),
    );
    button.dispatchEvent(
      new MouseEvent("mousedown", { bubbles: true, button: 0 }),
    );
    button.focus();
    button.dispatchEvent(
      new MouseEvent("mouseup", { bubbles: true, button: 0 }),
    );
    button.click();
  });
  await settle();
}
function composer() {
  const input = host.querySelector("textarea");
  if (!input) throw new Error("Missing composer");
  return input;
}
function dialog() {
  const popup = document.querySelector('[role="dialog"]');
  if (!popup) throw new Error("Missing composer popover");
  return popup;
}
async function pressEscape() {
  await act(async () => {
    document.activeElement?.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      }),
    );
  });
  await settle();
}

beforeEach(async () => {
  vi.useFakeTimers();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root.render(<Harness />));
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("keeps one popup mounted while switching add, inline models, context, and back", async () => {
  await click("Open add");
  const popup = dialog();
  expect(popup.textContent).toContain("Add Saves");
  expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(1);
  await click("Open models");
  expect(dialog()).toBe(popup);
  expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(1);
  expect(popup.querySelector('[role="listbox"]')?.textContent).toContain(
    "Local model",
  );
  expect(document.activeElement?.getAttribute("aria-label")).toBe(
    "Search models",
  );
  const option = [
    ...popup.querySelectorAll<HTMLElement>('[role="option"]'),
  ].find((element) => element.textContent === "Local model");
  if (!option) throw new Error("Missing inline model option");
  await act(async () => option.click());
  expect(host.querySelector("output")?.textContent).toBe("Local model");
  expect(dialog()).toBe(popup);
  await click("Open context");
  expect(dialog()).toBe(popup);
  expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(1);
  expect(document.activeElement?.getAttribute("aria-label")).toBe(
    "Search Saves",
  );
  await click("Back to composer options");
  expect(dialog()).toBe(popup);
  expect(popup.textContent).toContain("Add Saves");
});

it("closes on Escape and restores composer focus", async () => {
  await click("Open context");
  expect(document.activeElement?.getAttribute("aria-label")).toBe(
    "Search Saves",
  );
  await pressEscape();
  expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(0);
  expect(document.activeElement).toBe(composer());
});

it("keeps typing focus and draft text when suggestions open", async () => {
  await act(async () => {
    const input = composer();
    input.focus();
    Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value",
    )?.set?.call(input, "Compare @film");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await settle();
  expect(dialog().querySelector('[role="listbox"]')?.textContent).toContain(
    "A saved film",
  );
  expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(1);
  expect(document.activeElement).toBe(composer());
  expect(composer().value).toBe("Compare @film");
});
