/** Actions the stage runs inside the app frame, through the same state and events the real app uses. */
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  type LexicalEditor,
} from "lexical";
import { saveLibraryBridge } from "@/features/saves/lib/library-bridge";
import { getAppRouter } from "@/shared/lib/app-router";
import { emit } from "./bridge";
import { clock } from "./clock";
import { SYNCED } from "./constants";
import { applyPrefs, resetPreferences, reveal, saves } from "./fixtures";

function point(element: Element) {
  const rect = element.getBoundingClientRect();
  return {
    bubbles: true,
    cancelable: true,
    composed: true,
    clientX: rect.x + rect.width / 2,
    clientY: rect.y + rect.height / 2,
    button: 0,
    pointerId: 1,
    pointerType: "mouse",
    isPrimary: true,
  };
}

function find(selector: string) {
  const element = document.querySelector(selector);
  if (!element) throw new Error(`director: no element for ${selector}`);
  return element;
}

function byText(text: string, root: ParentNode = document) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node.textContent?.trim() === text && node.parentElement)
      return node.parentElement;
  }
  throw new Error(`director: no text "${text}"`);
}

function scroller(element: Element) {
  for (let node = element.parentElement; node; node = node.parentElement) {
    const overflow = getComputedStyle(node).overflowY;
    if (/auto|scroll/.test(overflow) && node.scrollHeight > node.clientHeight)
      return node;
  }
  return document.scrollingElement as HTMLElement;
}

/** Jumps the nearest scroll container so `text` sits `top` px below its edge. */
function scrollTo(text: string, top = 24) {
  const element = byText(text);
  const container = scroller(element);
  const offset =
    element.getBoundingClientRect().top - container.getBoundingClientRect().top;
  container.scrollTop += offset - top;
}

/** Flips the switch in the settings row titled `label`. */
function toggle(label: string) {
  let row: Element | null = byText(label);
  while (row && !row.querySelector("[role=switch]")) row = row.parentElement;
  const control = row?.querySelector("[role=switch]");
  if (!control) throw new Error(`director: no switch for "${label}"`);
  pressElement(control);
}

/** Opens the select in the settings row titled `label`. */
function openSelect(label: string) {
  let row: Element | null = byText(label);
  while (row && !row.querySelector("[role=combobox]")) row = row.parentElement;
  const control = row?.querySelector("[role=combobox]");
  if (!control) throw new Error(`director: no select for "${label}"`);
  pressElement(control);
}

function pick(option: string) {
  const match = [...document.querySelectorAll("[role=option]")].find(
    (element) => element.textContent?.trim().endsWith(option),
  );
  if (!match) throw new Error(`director: no option "${option}"`);
  pressElement(match);
}

function press(selector: string) {
  pressElement(find(selector));
}

function pressElement(element: Element) {
  const init = point(element);
  element.dispatchEvent(new PointerEvent("pointerdown", init));
  element.dispatchEvent(new MouseEvent("mousedown", init));
  if (element instanceof HTMLElement) element.focus({ preventScroll: true });
  element.dispatchEvent(new PointerEvent("pointerup", init));
  element.dispatchEvent(new MouseEvent("mouseup", init));
  element.dispatchEvent(new MouseEvent("click", init));
}

function type(selector: string, text: string) {
  const element = find(selector) as HTMLInputElement | HTMLTextAreaElement;
  element.focus({ preventScroll: true });
  const prototype = Object.getPrototypeOf(element);
  const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
  setter?.call(element, text);
  element.dispatchEvent(new Event("input", { bubbles: true }));
}

/** Rewrites a Lexical editor's text through its own update cycle. */
function compose(selector: string, text: string) {
  const element = find(selector) as HTMLElement & {
    __lexicalEditor?: LexicalEditor;
  };
  const editor = element.__lexicalEditor;
  if (!editor) throw new Error(`director: ${selector} is not a Lexical root`);
  element.focus({ preventScroll: true });
  editor.update(() => {
    const paragraph = $createParagraphNode();
    const node = $createTextNode(text);
    paragraph.append(node);
    $getRoot().clear().append(paragraph);
    node.select(text.length, text.length);
  });
}

function key(selector: string, name: string) {
  const element = find(selector);
  const init = { key: name, code: name, bubbles: true, cancelable: true };
  element.dispatchEvent(new KeyboardEvent("keydown", init));
  element.dispatchEvent(new KeyboardEvent("keyup", init));
}

function rect(selector: string) {
  const box = document.querySelector(selector)?.getBoundingClientRect();
  return box
    ? { x: box.x, y: box.y, width: box.width, height: box.height }
    : null;
}

async function realFrames(count: number) {
  for (let index = 0; index < count; index++) await clock.realFrame();
}

async function settled() {
  const images = [...document.images].filter((image) => !image.complete);
  if (!images.length) return;
  await Promise.race([
    Promise.all(images.map((image) => image.decode().catch(() => {}))),
    realFrames(90),
  ]);
}

export const director = {
  clock,
  saves,
  emit,
  applyPrefs,
  resetPreferences,
  reveal,
  synced: () => saves.slice(0, SYNCED).map((save) => save.id),
  press,
  type,
  compose,
  scrollTo,
  toggle,
  openSelect,
  pick,
  section: (name: string) =>
    (
      window as Window & { __settingsGo?: (section: string) => void }
    ).__settingsGo?.(name),
  key,
  rect,
  settled,
  navigate: (to: string) => void getAppRouter()?.navigate({ to }),
  select: (id: string) => press(`[data-save-id="${id}"] img`),
  inspect: (id: string, tab: "organize" | "info") => {
    saveLibraryBridge.inspectSave(id);
    saveLibraryBridge.setInspectorTab(tab);
  },
  closePane: () => saveLibraryBridge.closeRightPane(),
  agent: (open: boolean) => saveLibraryBridge.setAgentOpen(open),
  ready: () => document.querySelectorAll("[data-save-id] img").length > 8,
};

export type Director = typeof director;

Object.assign(window, { __director: director });
