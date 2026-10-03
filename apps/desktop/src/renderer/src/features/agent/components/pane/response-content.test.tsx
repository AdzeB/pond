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

it("keeps the completed work summary above the response", async () => {
  const state: AssistantState = {
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
