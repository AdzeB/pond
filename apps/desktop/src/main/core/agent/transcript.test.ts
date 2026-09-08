import * as schema from "@pond/schema/db";
import {
  chat,
  type ModelMessage,
  maxIterations,
  toolDefinition,
} from "@tanstack/ai";
import { withCompaction } from "@tanstack/ai-compaction";
import { openaiCompatibleText } from "@tanstack/ai-openai/compatible";
import { withPersistence } from "@tanstack/ai-persistence";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { initializePondSchema } from "../../db";
import { createAgentPersistence, loadModelTranscript } from "./transcript";

function nativeAvailable() {
  try {
    new Database(":memory:").close();
    return true;
  } catch (error) {
    if (process.versions.electron) throw error;
    return false;
  }
}

const databases: Database.Database[] = [];
afterEach(() => {
  for (const db of databases.splice(0)) db.close();
});
function setup() {
  const sqlite = new Database(":memory:");
  databases.push(sqlite);
  initializePondSchema(sqlite, () => false);
  const db = drizzle(sqlite, { schema });
  db.insert(schema.agentChats)
    .values({ id: "chat", title: "Existing chat" })
    .run();
  return { db, sqlite, store: createAgentPersistence(db).stores.messages };
}

const turn: ModelMessage[] = [
  { id: "user", role: "user", content: "Search" },
  {
    id: "call",
    role: "assistant",
    content: null,
    toolCalls: [
      {
        id: "tool",
        type: "function",
        function: { name: "searchLibrary", arguments: "{}" },
        metadata: { thoughtSignature: "signature" },
      },
    ],
  },
  { id: "result", role: "tool", toolCallId: "tool", content: "Found a Save" },
  { id: "answer", role: "assistant", content: "Raw answer" },
];

describe.skipIf(!nativeAvailable())("canonical agent transcript", () => {
  it("round trips full tool messages and replaces instead of appending", async () => {
    const { store } = setup();
    await store.saveThread("chat", turn);
    expect(await store.loadThread("chat")).toEqual(turn);
    await store.saveThread("chat", turn.slice(0, 1));
    expect(await store.loadThread("chat")).toEqual(turn.slice(0, 1));
    expect(await store.loadThread("missing")).toEqual([]);
  });

  it("imports legacy IDs without rewriting visible metadata and survives schema reopening", async () => {
    const { db, sqlite, store } = setup();
    db.insert(schema.agentMessages)
      .values({
        id: "user",
        chatId: "chat",
        role: "user",
        content: "Search",
        metadata: { scopeLabel: "Library" },
      })
      .run();
    expect((await store.loadThread("chat"))[0]).toMatchObject({
      id: "user",
      role: "user",
      content: "Search",
    });
    await store.saveThread("chat", turn);
    initializePondSchema(sqlite, () => false);
    expect(await store.loadThread("chat")).toEqual(turn);
    expect(db.select().from(schema.agentMessages).all()[0]?.metadata).toEqual({
      scopeLabel: "Library",
    });
  });

  it("uses validated visible replies while retaining tool history and later shortcut turns", async () => {
    const { db, store } = setup();
    db.insert(schema.agentMessages)
      .values([
        {
          id: "user",
          chatId: "chat",
          role: "user",
          content: "Search",
          createdAt: new Date(1),
        },
        {
          id: "visible",
          chatId: "chat",
          role: "assistant",
          content: "Validated answer",
          createdAt: new Date(2),
        },
        {
          id: "next",
          chatId: "chat",
          role: "user",
          content: "Missing thing",
          createdAt: new Date(3),
        },
        {
          id: "empty",
          chatId: "chat",
          role: "assistant",
          content: "No matches",
          createdAt: new Date(4),
        },
      ])
      .run();
    await store.saveThread("chat", turn);
    const messages = await loadModelTranscript("chat", db);
    expect(messages.map((row) => row.id)).toEqual([
      "user",
      "call",
      "result",
      "visible",
      "next",
      "empty",
    ]);
    expect(messages[3]?.content).toBe("Validated answer");
    expect(messages[1]?.toolCalls).toEqual(turn[1]?.toolCalls);
  });

  it("does not recreate a deleted conversation when an old run saves", async () => {
    const { db, store } = setup();
    db.delete(schema.agentChats).run();
    await expect(store.saveThread("chat", turn)).rejects.toThrow(
      "no longer exists",
    );
    expect(await store.loadThread("chat")).toEqual([]);
  });
  it("persists the actual tool loop's canonical history while compacting provider context", async () => {
    const { db, store } = setup();
    let requests = 0;
    const requestSizes: number[] = [];
    const adapter = openaiCompatibleText("offline-fixture", {
      apiKey: "offline-key",
      baseURL: "http://fixture.invalid/v1",
      fetch: async (_url, options) => {
        const body = z
          .object({ messages: z.array(z.json()) })
          .parse(JSON.parse(z.string().parse(options?.body)));
        requestSizes.push(body.messages.length);
        const first = requests++ === 0;
        const chunk = {
          id: "completion",
          choices: [
            {
              index: 0,
              delta: first
                ? {
                    tool_calls: [
                      {
                        index: 0,
                        id: "lookup",
                        type: "function",
                        function: { name: "searchLibrary", arguments: "{}" },
                      },
                    ],
                  }
                : { content: "Found it" },
              finish_reason: first ? "tool_calls" : "stop",
            },
          ],
        };
        return new Response(
          `data: ${JSON.stringify(chunk)}\n\ndata: [DONE]\n\n`,
          { headers: { "Content-Type": "text/event-stream" } },
        );
      },
    });
    const history: ModelMessage[] = Array.from({ length: 30 }, (_, index) => ({
      id: `old-${index}`,
      role: index % 2 === 0 ? "user" : "assistant",
      content: "Earlier discussion. ".repeat(100),
    }));
    history.push({ id: "new", role: "user", content: "Search" });
    for await (const chunk of chat({
      adapter,
      threadId: "chat",
      messages: history,
      tools: [
        toolDefinition({
          name: "searchLibrary",
          description: "Search",
          inputSchema: z.object({}),
        }).server(async () => "A Save"),
      ],
      agentLoopStrategy: maxIterations(2),
      middleware: [
        withPersistence(createAgentPersistence(db)),
        withCompaction({ maxTokens: 2000 }),
      ],
    })) {
      expect(chunk.type).not.toBe("RUN_ERROR");
    }
    const stored = await store.loadThread("chat");
    expect(requests).toBe(2);
    expect(requestSizes.every((size) => size < history.length)).toBe(true);
    expect(stored.slice(0, history.length)).toEqual(history);
    expect(
      stored.some((message) =>
        message.toolCalls?.some((call) => call.id === "lookup"),
      ),
    ).toBe(true);
    expect(
      stored.some(
        (message) => message.role === "tool" && message.toolCallId === "lookup",
      ),
    ).toBe(true);
    expect(stored.at(-1)?.content).toBe("Found it");
  });

  it("excludes unsafe replies but preserves paired calls and valid stopped text", async () => {
    const { db, store } = setup();
    db.insert(schema.agentMessages)
      .values([
        {
          id: "user",
          chatId: "chat",
          role: "user",
          content: "Search",
          createdAt: new Date(1),
        },
        {
          id: "bad",
          chatId: "chat",
          role: "assistant",
          content: "Attached Save metadata: secret",
          metadata: { error: "Unreadable" },
          createdAt: new Date(2),
        },
        {
          id: "next",
          chatId: "chat",
          role: "user",
          content: "Explain",
          createdAt: new Date(3),
        },
        {
          id: "stopped",
          chatId: "chat",
          role: "assistant",
          content: "A useful beginning",
          metadata: { stopped: true },
          createdAt: new Date(4),
        },
      ])
      .run();
    await store.saveThread("chat", turn);
    const messages = await loadModelTranscript("chat", db);
    expect(messages.some((message) => message.id === "bad")).toBe(false);
    expect(messages.some((message) => message.id === "stopped")).toBe(true);
    expect(messages.some((message) => message.id === "call")).toBe(true);
    expect(messages.some((message) => message.id === "result")).toBe(true);
  });
});
