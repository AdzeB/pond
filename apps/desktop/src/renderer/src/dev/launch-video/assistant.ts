import type { AgentStreamEvent } from "@shared/agent-stream";
import type { AssistantSource } from "@shared/assistant";
import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { defineMethods, defineQueries } from "./bridge";
import { QUESTION } from "./constants";
import { saves } from "./fixtures";

const CITED = ["Burgundy bag", "Red purse"];

const REPLY = [
  "You've saved two. A [Burgundy bag](#save-1) with a long knotted strap,",
  " and a [Red purse](#save-2) shot against a pink backdrop.",
  " Both sit in Objects.",
].join("");

let answered = false;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function sources(): AssistantSource[] {
  return CITED.flatMap((title) => {
    const save = saves.find((candidate) => candidate.title === title);
    if (!save) return [];
    return [
      {
        id: save.id,
        title: save.title,
        url: save.url ?? "",
        source: save.source,
        description: save.caption,
      },
    ];
  });
}

defineMethods({
  agentStream(_body: unknown, receive: unknown) {
    const send = receive as (event: AgentStreamEvent) => void;
    const response = createUIMessageStreamResponse({
      stream: createUIMessageStream({
        execute: async ({ writer }) => {
          writer.write({ type: "start" });
          writer.write({
            type: "data-pond-activity",
            id: "current-activity",
            data: { activity: "searching" },
          });
          await sleep(700);
          writer.write({ type: "data-pond-sources", data: sources() });
          await sleep(200);
          writer.write({ type: "text-start", id: "text-1" });
          for (const word of REPLY.match(/\S+\s*/g) ?? []) {
            writer.write({ type: "text-delta", id: "text-1", delta: word });
            await sleep(55);
          }
          writer.write({ type: "text-end", id: "text-1" });
          writer.write({ type: "finish", finishReason: "stop" });
          answered = true;
        },
      }),
    });
    const reader = response.body?.getReader();
    let closed = false;
    void (async () => {
      while (!closed && reader) {
        const { done, value } = await reader.read();
        if (done) break;
        send({ type: "data", data: Array.from(value) });
      }
      if (!closed) send({ type: "end" });
    })();
    return () => {
      closed = true;
      void reader?.cancel();
    };
  },
});

defineQueries({
  "agent.newChat": () => ({
    id: "chat-launch",
    title: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  "agent.messages": ({ chatId }) =>
    answered
      ? [
          {
            id: "message-question",
            chatId,
            role: "user",
            content: QUESTION,
            metadata: null,
            createdAt: new Date(),
          },
          {
            id: "message-reply",
            chatId,
            role: "assistant",
            content: REPLY,
            metadata: {
              elapsedMs: 2400,
              sources: sources().map((source) => ({
                ...source,
                description: source.description ?? null,
                notes: null,
              })),
            },
            createdAt: new Date(),
          },
        ]
      : [],
  "agent.keys": () => [
    { provider: "anthropic", hasKey: true, masked: "sk-…", enabled: true },
  ],
  "agent.listAvailableModels": () => ({ providers: [] }),
  "agent.mcpSnippet": () => ({
    command: "/Applications/Pond.app/Contents/MacOS/pond-mcp",
    args: ["--stdio"],
    json: JSON.stringify(
      {
        mcpServers: {
          pond: {
            command: "/Applications/Pond.app/Contents/MacOS/pond-mcp",
            args: ["--stdio"],
          },
        },
      },
      null,
      2,
    ),
    app: "Pond",
  }),
});
