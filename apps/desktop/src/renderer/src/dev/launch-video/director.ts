/** Actions the stage runs inside the app frame, through the same state and events the real app uses. */
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  type LexicalEditor,
} from "lexical";
import { saveLibraryBridge } from "@/features/saves/lib/library-bridge";
import { getAppRouter } from "@/shared/lib/app-router";
import { clock } from "./clock";

function find(selector: string) {
  const element = document.querySelector(selector);
  if (!element) throw new Error(`director: no element for ${selector}`);
  return element;
}

function press(selector: string) {
  const element = find(selector);
  const rect = element.getBoundingClientRect();
  const init = {
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
  element.dispatchEvent(new PointerEvent("pointerdown", init));
  element.dispatchEvent(new MouseEvent("mousedown", init));
  if (element instanceof HTMLElement) element.focus({ preventScroll: true });
  element.dispatchEvent(new PointerEvent("pointerup", init));
  element.dispatchEvent(new MouseEvent("mouseup", init));
  element.dispatchEvent(new MouseEvent("click", init));
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
  press,
  compose,
  key,
  settled,
  navigate: (to: string) => void getAppRouter()?.navigate({ to }),
  closePanes: () => {
    saveLibraryBridge.closeRightPane();
    saveLibraryBridge.setAgentOpen(false);
  },
  ready: () => document.querySelectorAll("[data-save-id] img").length > 8,
};

export type Director = typeof director;

Object.assign(window, { __director: director });
