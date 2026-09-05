// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { Question } from "./question";

it("supports choices, freeform focus, busy and resolved states", async () => {
  const host = document.createElement("div");
  const root = createRoot(host);
  const onAnswer = vi.fn();
  const onWrite = vi.fn();
  const props = {
    question: { question: "Which topic?", options: ["Film", "Architecture"] },
    disabled: false,
    onAnswer,
    onWrite,
  };
  await act(async () => {
    root.render(<Question {...props} />);
  });
  await act(async () => {
    host.querySelectorAll("button")[0]?.click();
    host.querySelectorAll("button")[2]?.click();
  });
  expect(onAnswer).toHaveBeenCalledExactlyOnceWith("Film");
  expect(onWrite).toHaveBeenCalledOnce();
  await act(async () => {
    root.render(<Question {...props} disabled />);
  });
  expect(
    [...host.querySelectorAll("button")].every((button) => button.disabled),
  ).toBe(true);
  await act(async () => {
    root.render(<Question {...props} answer="Typography" />);
  });
  expect(host.textContent).toContain("Answered: Typography");
  expect(host.querySelector("button")).toBeNull();
  await act(async () => root.unmount());
});
