import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterAll, afterEach, beforeEach, expect, it, vi } from "vitest";
import type { AssistantState } from "@/features/agent/state/assistant";
import { toUIMessage } from "@/features/agent/state/pond-messages";
import { AgentMessage } from "./index";
import { ResponseContent } from "./response-content";

beforeEach(() => {
  vi.stubGlobal("pond", { query: async () => [] });
});
afterAll(() => vi.unstubAllGlobals());

const host = document.createElement("div");
document.body.append(host);
let root = createRoot(host);
afterEach(async () => {
  await act(async () => root.unmount());
  root = createRoot(host);
});

it("renders a citation-only lookup as visual Saves instead of numbered prose", async () => {
  const sources = Array.from({ length: 3 }, (_, index) => ({
    id: `save-${index + 1}`,
    title: `CRM reference ${index + 1}`,
    url: `https://example.com/${index + 1}`,
    source: "arena",
  }));
  await act(async () =>
    root.render(
      <ResponseContent
        message={{
          id: "reply",
          chatId: "chat",
          role: "assistant",
          content: [
            "1. [1] A resizable sidebar for an AI-native CRM.",
            "2. [2] A customer account side drawer.",
            "3. [3] A loading animation for a CRM.",
          ].join("\n"),
          metadata: { sources },
        }}
        questionDisabled
        provider="openai"
        attachedIds={[]}
        busy={false}
        attach={vi.fn()}
      />,
    ),
  );
  expect(
    host.querySelectorAll('[aria-label^="Preview CRM reference"]'),
  ).toHaveLength(3);
  expect(host.textContent).not.toContain("A resizable sidebar");
  expect(host.textContent).toContain("CRM reference 1");
});

it("shows proposed tags as chips and leaves changed Saves out of the consulted list", async () => {
  const sources = Array.from({ length: 3 }, (_, index) => ({
    id: `save-${index + 1}`,
    title: `Clock ${index + 1}`,
    url: `https://example.com/${index + 1}`,
    source: "twitter",
  }));
  await act(async () =>
    root.render(
      <ResponseContent
        message={{
          id: "reply",
          chatId: "chat",
          role: "assistant",
          content: "Proposed tags.",
          metadata: {
            sources,
            changes: [
              {
                id: "save-1:tags",
                saveId: "save-1",
                title: "Clock 1 https://t.co/abc",
                reason: "A clock interface.",
                status: "pending",
                field: "tags",
                before: ["Design"],
                after: ["Design", "Clock"],
              },
            ],
          },
        }}
        questionDisabled
        provider="openai"
        attachedIds={[]}
        busy={false}
        attach={vi.fn()}
      />,
    ),
  );
  expect(
    host.querySelector('[aria-label="Apply 1 change to your library?"]'),
  ).not.toBeNull();
  const row = host.querySelector('[aria-label="Open Clock 1"]');
  expect(row?.textContent).toContain("+Clock");
  expect(row?.textContent).not.toContain("Design");
  expect(
    [...host.querySelectorAll('[aria-label^="Preview Clock"]')].map((node) =>
      node.getAttribute("aria-label"),
    ),
  ).toEqual(["Preview Clock 2", "Preview Clock 3"]);
});

it("captions resolved rows with their status and leaves a lone pending change to the footer", async () => {
  const change = (
    index: number,
    status: "pending" | "applied" | "dismissed",
  ) => ({
    id: `save-${index}:tags`,
    saveId: `save-${index}`,
    title: `Clock ${index}`,
    reason: "A clock interface.",
    status,
    field: "tags" as const,
    before: [],
    after: ["Clock"],
  });
  await act(async () =>
    root.render(
      <ResponseContent
        message={{
          id: "reply",
          chatId: "chat",
          role: "assistant",
          content: "Proposed tags.",
          metadata: {
            changes: [
              change(1, "pending"),
              change(2, "applied"),
              change(3, "dismissed"),
            ],
          },
        }}
        questionDisabled
        provider="openai"
        attachedIds={[]}
        busy={false}
        attach={vi.fn()}
      />,
    ),
  );
  const tile = (title: string) =>
    host.querySelector(`[aria-label="Open ${title}"]`)?.closest("li");
  const labels = (title: string) =>
    [...(tile(title)?.querySelectorAll("button[aria-label]") ?? [])]
      .map((button) => button.getAttribute("aria-label"))
      .filter((label) => !label?.startsWith("Open"));

  expect(tile("Clock 1")?.textContent).toContain("+Clock");
  expect(labels("Clock 1")).toEqual([]);
  expect(
    [
      ...host.querySelectorAll(
        '[aria-label="Apply 1 change to your library?"] button',
      ),
    ].map((button) => button.textContent),
  ).toContain("Apply");
  expect(tile("Clock 2")?.textContent).toContain("Applied");
  expect(tile("Clock 2")?.textContent).not.toContain("+Clock");
  expect(labels("Clock 2")).toEqual(["Undo change to Clock 2"]);
  expect(tile("Clock 3")?.textContent).toContain("Dismissed");
  expect(labels("Clock 3")).toEqual([]);
});

it("shows a decided review as the same rows with an outcome title and no footer", async () => {
  await act(async () =>
    root.render(
      <ResponseContent
        message={{
          id: "reply",
          chatId: "chat",
          role: "assistant",
          content: "Proposed tags.",
          metadata: {
            changes: (["applied", "dismissed"] as const).map((status, i) => ({
              id: `save-${i}:tags`,
              saveId: `save-${i}`,
              title: `Clock ${i}`,
              reason: "",
              status,
              field: "tags" as const,
              before: [],
              after: ["Clock"],
            })),
          },
        }}
        questionDisabled
        provider="openai"
        attachedIds={[]}
        busy={false}
        attach={vi.fn()}
      />,
    ),
  );
  const card = host.querySelector('[aria-label="Applied 1, dismissed 1"]');
  expect(card?.textContent).toContain("Clock 0Applied");
  expect(card?.textContent).toContain("Clock 1Dismissed");
  expect(
    [...(card?.querySelectorAll("button") ?? [])]
      .map((button) => button.getAttribute("aria-label") ?? button.textContent)
      .filter((label) => !label?.startsWith("Open")),
  ).toEqual(["Undo change to Clock 0"]);
});

it("asks for Empty Trash in its own destructive card", async () => {
  await act(async () =>
    root.render(
      <ResponseContent
        message={{
          id: "reply",
          chatId: "chat",
          role: "assistant",
          content: "Empty it.",
          metadata: {
            changes: [
              {
                id: "purge",
                saveId: "",
                title: "Trash",
                reason: "",
                status: "pending",
                field: "action",
                action: "purgeTrash",
                before: null,
                after: "Empty Trash",
                undoable: false,
              },
            ],
          },
        }}
        questionDisabled
        provider="openai"
        attachedIds={[]}
        busy={false}
        attach={vi.fn()}
      />,
    ),
  );
  const card = host.querySelector('[aria-label="Empty Trash?"]');
  expect(card).not.toBeNull();
  expect(
    [...(card?.querySelectorAll("button") ?? [])].map((b) => b.textContent),
  ).toEqual(["Keep Trash", "Empty Trash"]);
  expect(host.querySelector('[aria-label^="Apply"]')).toBeNull();
});

it("keeps the completed work summary above the response", async () => {
  const state: AssistantState = {
    fishId: "default",
    chatId: "chat",
    chats: [],
    referenceMessageId: null,
    messages: [],
    draft: "",
    attachments: [],
    files: [],
    busy: false,
    loading: false,
    requestId: null,
    sources: [],
    activity: "thinking",
    results: [],
    steps: [],
    error: null,
    failed: null,
  };
  await act(async () =>
    root.render(
      <AgentMessage
        message={toUIMessage({
          id: "reply",
          chatId: "chat",
          role: "assistant",
          content: "A completed response.",
          metadata: { elapsedMs: 30_000 },
        })}
        state={state}
        provider="openai"
        attachedIds={[]}
        attach={vi.fn()}
        streaming={false}
        latest
        onAnswer={vi.fn()}
      />,
    ),
  );

  const response = [...host.querySelectorAll("p")].find(
    (element) => element.textContent === "A completed response.",
  );
  const summary = [...host.querySelectorAll("button")].find(
    (element) => element.textContent === "Worked for 30s",
  );
  if (!response || !summary)
    throw new Error("Missing response or work summary");
  expect(response.compareDocumentPosition(summary)).toBe(
    Node.DOCUMENT_POSITION_PRECEDING,
  );
});
