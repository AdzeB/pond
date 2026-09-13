// @vitest-environment jsdom
import type { AssistantSource } from "@shared/assistant";
import { act, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ComposerSuggestions } from "./composer-suggestions";
import { useComposerSuggestions } from "./use-composer-suggestions";

const query = vi.fn();
const submit = vi.fn();
const save: AssistantSource = {
  id: "film",
  title: "Suspiria",
  url: "https://example.com/film",
  source: "arena",
};
let host: HTMLDivElement;
let root: Root;
function Harness() {
  const [value, setValue] = useState("");
  const [attachments, setAttachments] = useState<AssistantSource[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const suggestions = useComposerSuggestions({
    value,
    attachments,
    inputRef,
    disabled: false,
    onChange: setValue,
    onAttach: (saves) => setAttachments((prev) => [...prev, ...saves]),
  });
  return (
    <>
      <ComposerSuggestions suggestions={suggestions} anchorRef={anchorRef} />
      <div ref={anchorRef}>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <textarea
            ref={inputRef}
            value={value}
            {...suggestions.inputProps}
            onKeyDown={(event) => {
              if (suggestions.onKeyDown(event)) return;
              if (
                event.key !== "Enter" ||
                event.shiftKey ||
                event.nativeEvent.isComposing
              )
                return;
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }}
          />
        </form>
      </div>
      <output>{attachments.map((s) => s.title).join(", ")}</output>
      <button type="button">Outside</button>
    </>
  );
}
function textarea() {
  const element = host.querySelector("textarea");
  if (!element) throw new Error("Missing composer");
  return element;
}
async function type(value: string) {
  await act(async () => {
    const element = textarea();
    element.focus();
    Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value",
    )?.set?.call(element, value);
    element.setSelectionRange(value.length, value.length);
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
async function press(key: string, init: KeyboardEventInit = {}) {
  await act(async () =>
    textarea().dispatchEvent(
      new KeyboardEvent("keydown", {
        key,
        bubbles: true,
        cancelable: true,
        ...init,
      }),
    ),
  );
}
async function search() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(160);
  });
}
beforeEach(async () => {
  vi.useFakeTimers();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("pond", { query });
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  Element.prototype.scrollIntoView = vi.fn();
  query.mockReset().mockResolvedValue({ saves: [save] });
  submit.mockClear();
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
it("filters actions and inserts on Enter without sending", async () => {
  await type("/con");
  expect(document.querySelector('[role="listbox"]')?.textContent).toContain(
    "Connect Ideas",
  );
  expect(document.querySelectorAll('[role="option"]')).toHaveLength(1);
  await press("Enter");
  expect(textarea().value).toBe(
    "Find shared themes and connections between these Saves. ",
  );
  expect(submit).not.toHaveBeenCalled();
  expect(document.activeElement).toBe(textarea());
});
it("supports arrows, Tab selection, and Escape dismissal", async () => {
  await type("/");
  await press("ArrowUp");
  expect(
    document.querySelector('[aria-selected="true"]')?.textContent,
  ).toContain("Describe Images");
  await press("Tab");
  expect(textarea().value).toContain("Look at these Saves");
  await type("/sum");
  await press("Escape");
  expect(textarea().getAttribute("aria-expanded")).toBe("false");
  expect(textarea().value).toBe("/sum");
  expect(submit).not.toHaveBeenCalled();
});
it("reopens a dismissed action menu when its trigger is typed again", async () => {
  await type("/sum");
  await press("Escape");
  expect(textarea().getAttribute("aria-expanded")).toBe("false");
  await type("");
  await type("/sum");
  expect(textarea().getAttribute("aria-expanded")).toBe("true");
  await press("Enter");
  expect(textarea().value).toContain("Summarize the main ideas");
  expect(submit).not.toHaveBeenCalled();
});
it("attaches a Save without duplicating its title in the draft", async () => {
  await type("Compare @sus");
  await search();
  expect(query).toHaveBeenCalledWith("agent.searchSaves", {
    query: "sus",
    limit: 12,
  });
  await press("Enter");
  expect(textarea().value).toBe("Compare ");
  expect(host.querySelector("output")?.textContent).toBe("Suspiria");
  expect(submit).not.toHaveBeenCalled();
  await type("Compare Suspiria @sus");
  await search();
  expect(document.querySelectorAll('[role="option"]')).toHaveLength(0);
});
it("ignores old search responses and does not submit while results are loading", async () => {
  const old = Promise.withResolvers<{ saves: AssistantSource[] }>();
  query.mockReturnValueOnce(old.promise).mockResolvedValueOnce({
    saves: [{ ...save, id: "new", title: "New result" }],
  });
  await type("@old");
  await search();
  await type("@new");
  await press("Enter");
  expect(submit).not.toHaveBeenCalled();
  await search();
  await act(async () => old.resolve({ saves: [save] }));
  expect(document.querySelector('[role="listbox"]')?.textContent).toContain(
    "New result",
  );
  expect(document.querySelector('[role="listbox"]')?.textContent).not.toContain(
    "Suspiria",
  );
});
it("shows failed and empty searches without submitting the trigger", async () => {
  query.mockRejectedValueOnce(new Error("offline"));
  await type("@sus");
  await search();
  expect(document.querySelector('[role="status"]')?.textContent).toContain(
    "Could not search Saves",
  );
  await press("Enter");
  expect(submit).not.toHaveBeenCalled();
  query.mockResolvedValueOnce({ saves: [] });
  await type("@missing");
  await search();
  expect(document.querySelector('[role="status"]')?.textContent).toContain(
    "No Saves found",
  );
});
it("ignores Enter during input composition and permits Shift+Enter", async () => {
  await type("/sum");
  await press("Enter", { isComposing: true });
  await press("Enter", { shiftKey: true });
  expect(textarea().value).toBe("/sum");
  expect(submit).not.toHaveBeenCalled();
});

it("sends on Enter but keeps Shift+Enter and IME confirmation in the composer", async () => {
  await type("Find a save");
  await press("Enter", { shiftKey: true });
  expect(submit).not.toHaveBeenCalled();
  await press("Enter", { isComposing: true });
  expect(submit).not.toHaveBeenCalled();
  await press("Enter");
  expect(submit).toHaveBeenCalledOnce();
});
