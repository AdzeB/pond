import { act } from "react";
import { expect, it, vi } from "vitest";
import { assistant } from "./assistant";
import { createAssistantHarness } from "./assistant.test-harness";

const chats: Record<string, { id: string; title: string }[]> = {
  koi: [
    { id: "koi-latest", title: "Latest" },
    { id: "koi-older", title: "Older" },
  ],
  carp: [{ id: "carp-only", title: "Only" }],
  guppy: [],
};

it("opens a fish on its last chat and keeps a new-chat draft", async () => {
  vi.stubGlobal("pond", {
    query: async (name: string, args: { fishId?: string; chatId?: string }) =>
      name === "agent.chats"
        ? (chats[args.fishId ?? ""] ?? [])
        : name === "agent.messages"
          ? [
              {
                id: `${args.chatId}-reply`,
                chatId: args.chatId,
                role: "assistant",
                content: "An answer",
                metadata: null,
              },
            ]
          : {},
    onAgentChunk: () => () => {},
  });
  const harness = createAssistantHarness((state) => ({
    chatId: state.chatId,
    loading: state.loading,
  }));
  const shown = () => JSON.parse(harness.host.textContent || "{}");
  const open = async (fishId: string) => {
    await act(async () => assistant.selectFish(fishId));
    await vi.waitFor(async () => {
      await act(async () => {});
      expect(shown().loading).toBe(false);
    });
  };
  await harness.mount();
  try {
    await open("koi");
    expect(shown().chatId).toBe("koi-latest");

    await act(async () => assistant.openChat("koi-older"));
    await open("carp");
    expect(shown().chatId).toBe("carp-only");
    await open("koi");
    expect(shown().chatId).toBe("koi-older");

    await open("guppy");
    expect(shown().chatId).toBeNull();

    await open("carp");
    expect(shown().chatId).toBe("carp-only");
    await act(async () => {
      assistant.newChat();
      assistant.setDraft("Keep this");
    });
    await open("koi");
    await open("carp");
    expect(shown().chatId).toBeNull();
  } finally {
    await harness.unmount();
    assistant.setDraft("");
    assistant.newChat();
    vi.unstubAllGlobals();
  }
});
