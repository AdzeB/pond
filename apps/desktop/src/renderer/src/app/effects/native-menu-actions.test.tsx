import { afterEach, beforeEach, expect, it } from "vitest";
import { shouldIgnoreMenuAction } from "./native-menu-actions";

let editor: HTMLDivElement;

beforeEach(() => {
  editor = document.createElement("div");
  editor.contentEditable = "true";
  editor.tabIndex = 0;
  editor.setAttribute("role", "textbox");
  document.body.append(editor);
});

afterEach(() => {
  editor.remove();
});

it("ignores a native accelerator while the Assistant editor owns the keyboard", () => {
  editor.focus();
  expect(document.activeElement).toBe(editor);

  expect(shouldIgnoreMenuAction("accelerator")).toBe(true);
});

it("allows a native accelerator outside an editor", () => {
  document.body.focus();

  expect(shouldIgnoreMenuAction("accelerator")).toBe(false);
});

it("allows an explicit menu command while an editor has focus", () => {
  editor.focus();

  expect(shouldIgnoreMenuAction("menu")).toBe(false);
});
