// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { eventFromEditable, isEditableTarget } from "./editable-target";

describe("editable target", () => {
  it("treats contenteditable and textbox roles as typing surfaces", () => {
    const field = document.createElement("div");
    field.contentEditable = "true";
    field.setAttribute("role", "textbox");
    document.body.append(field);
    expect(isEditableTarget(field)).toBe(true);
    field.remove();
  });

  it("treats a nested node inside a textbox as typing", () => {
    const field = document.createElement("div");
    field.setAttribute("role", "textbox");
    const span = document.createElement("span");
    field.append(span);
    document.body.append(field);
    expect(isEditableTarget(span)).toBe(true);
    field.remove();
  });

  it("ignores button inputs", () => {
    const button = document.createElement("input");
    button.type = "button";
    expect(isEditableTarget(button)).toBe(false);
  });

  it("reads the event target for contenteditable keydowns", () => {
    const field = document.createElement("div");
    field.contentEditable = "true";
    field.tabIndex = 0;
    document.body.append(field);
    field.focus();
    const event = new KeyboardEvent("keydown", { key: "[", bubbles: true });
    Object.defineProperty(event, "target", { value: field });
    expect(eventFromEditable(event)).toBe(true);
    field.remove();
  });
});
