// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { ResponseContent } from "./response-content";

vi.mock("@/lib/save/ensure-saves", () => ({ ensureSaves: async () => {} }));
vi.mock("@/lib/ui/save-nav", () => ({ openSave: vi.fn() }));

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
        focus={vi.fn()}
      />,
    ),
  );
  expect(
    host.querySelectorAll('[aria-label^="Open CRM reference"]'),
  ).toHaveLength(3);
  expect(host.textContent).not.toContain("A resizable sidebar");
  expect(host.textContent).toContain("CRM reference 1");
});
