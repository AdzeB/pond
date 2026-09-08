import type { JsonObject } from "@pond/schema/json";
import { beforeEach, expect, it, vi } from "vitest";
import { z } from "zod";
import type { AssistantSource } from "../../../shared/assistant";
import {
  type CompletionInput,
  type CompletionStream,
  completeWithTools as complete,
} from "./complete";
import { contextDependencies, libraryContext } from "./context";

const mock = { chat: vi.fn<CompletionStream>() };
const completeWithTools = (input: CompletionInput) =>
  complete(input, mock.chat);

const dump =
  '{"saves":[{"id":"film","title":"Film","url":"https://example.com","description":"Transcript\\nShow transcript"}]}';

function request() {
  return {
    provider: "openai" as const,
    model: "gpt-5.6-sol",
    apiKey: "test-key",
    messages: [{ role: "user" as const, content: "Hey" }],
    context: "Library",
    tools: [],
    retrieveLibrary: vi.fn().mockResolvedValue([]),
    abortController: new AbortController(),
    onText: vi.fn(),
  };
}

function chatText(text: string) {
  mock.chat.mockImplementation(async function* () {
    if (text) yield { type: "TEXT_MESSAGE_CONTENT", delta: text };
  });
}

function retrieval(
  execute: (
    input: JsonObject,
  ) => Promise<{ saves?: AssistantSource[] } | undefined>,
) {
  return async (input: JsonObject) => {
    const result = await execute(input);
    return result?.saves ?? [];
  };
}

function tool(name: string, execute = vi.fn()) {
  return { name, description: name, schema: z.object({}), execute };
}

beforeEach(() => {
  mock.chat.mockReset();
  chatText("Hi! How can I help?");
});

const filmSources: AssistantSource[] = Array.from(
  { length: 8 },
  (_, index) => ({
    id: `film-${index}`,
    title: `Film ${index}`,
    source: "arena",
    url: `https://example.com/film-${index}`,
  }),
);

it.each([
  ["one", 1],
  ["two", 2],
  ["three", 3],
] as const)("honors %s requested references without losing consulted evidence", async (word, count) => {
  chatText("These references explore lighting.");
  const show = vi.fn();
  const retrieveLibrary = vi.fn().mockResolvedValue(filmSources);
  await completeWithTools({
    ...request(),
    messages: [{ role: "user", content: `Find ${word} film references` }],
    retrieveLibrary,
    tools: [tool("showSaves", show)],
  });
  expect(show).toHaveBeenCalledExactlyOnceWith({
    title: "film",
    saveIds: filmSources.slice(0, count).map((save) => save.id),
  });
  expect(mock.chat.mock.calls[0]?.[0].systemPrompts?.join("\n")).toContain(
    "Save ID: film-7",
  );
});

it("retrieves both audited alternatives without presentation instructions", async () => {
  chatText("These references explore lighting.");
  const retrieveLibrary = vi.fn().mockResolvedValue(filmSources);
  const show = vi.fn();
  await completeWithTools({
    ...request(),
    messages: [
      {
        role: "user",
        content:
          "Find three Saves about film or cinematography. Show them as Save results, then give one short sentence about each using only saved information. Only read; do not change anything.",
      },
    ],
    retrieveLibrary,
    tools: [tool("showSaves", show)],
  });
  expect(retrieveLibrary.mock.calls).toEqual([
    [{ query: "film", limit: 12 }],
    [{ query: "cinematography", limit: 12 }],
  ]);
  expect(show).toHaveBeenCalledExactlyOnceWith({
    title: "film or cinematography",
    saveIds: ["film-0", "film-1", "film-2"],
  });
});

it("keeps evidence and curated citations in registry order when searches settle out of order", async () => {
  const rows = filmSources.map((source) => ({
    ...source,
    source: "arena" as const,
    author: null,
    notes: null,
    description: null,
  }));
  let finishFilm: () => void = () => {};
  let finishCinema: () => void = () => {};
  const film = new Promise<{ saves: typeof rows }>((resolve) => {
    finishFilm = () => resolve({ saves: rows.slice(0, 2) });
  });
  const cinema = new Promise<{ saves: typeof rows }>((resolve) => {
    finishCinema = () => resolve({ saves: rows.slice(2, 4) });
  });
  const input = request();
  const context = libraryContext(
    {
      scope: {},
      signal: input.abortController.signal,
      onActivity: vi.fn(),
      onSources: vi.fn(),
    },
    {
      ...contextDependencies,
      searchLibrary: (args) => (args.query === "film" ? film : cinema),
    },
  );
  mock.chat.mockImplementation(async function* (options) {
    const evidence = options.systemPrompts?.join("\n");
    expect(evidence).toContain("[1] Film 2\nSave ID: film-2");
    expect(evidence).toContain("[3] Film 0\nSave ID: film-0");
    const show = options.tools?.find((tool) => tool.name === "showSaves");
    if (!show?.execute) throw new Error("Missing showSaves");
    await expect(
      show.execute({ title: "Selected", saveIds: ["film-0", "film-3"] }),
    ).resolves.toMatchObject({
      references: [
        { id: "film-0", reference: "#save-3" },
        { id: "film-3", reference: "#save-2" },
      ],
    });
    yield {
      type: "TEXT_MESSAGE_CONTENT",
      delta: "See [first selection](#save-3) and [second selection](#save-2).",
    };
  });
  const result = completeWithTools({
    ...input,
    messages: [
      {
        role: "user",
        content:
          "Find two Saves about film or cinematography. Summarize why each is relevant.",
      },
    ],
    retrieveLibrary: context.retrieve,
    sources: context.sources,
    tools: context.tools,
  });
  finishCinema();
  await cinema;
  finishFilm();
  expect(await result).toBe(
    "See [first selection](#save-3) and [second selection](#save-2).",
  );
  expect(context.sources().map((source) => source.id)).toEqual([
    "film-2",
    "film-3",
    "film-0",
    "film-1",
  ]);
  expect(context.results()).toEqual([
    { title: "Selected", saveIds: ["film-0", "film-3"] },
  ]);
});

it("validates citations against evidence added by later tools", async () => {
  const sources = filmSources.slice(0, 2);
  mock.chat.mockImplementation(async function* () {
    sources.push(...filmSources.slice(2, 3));
    yield {
      type: "TEXT_MESSAGE_CONTENT",
      delta: "See [additional evidence](#save-3).",
    };
  });
  const result = await completeWithTools({
    ...request(),
    messages: [{ role: "user", content: "Find film references" }],
    retrieveLibrary: async () => filmSources.slice(0, 2),
    sources: () => sources,
  });
  expect(result).toBe("See [additional evidence](#save-3).");
});

it("uses model-curated groups without adding an overlapping automatic group", async () => {
  const show = vi.fn();
  mock.chat.mockImplementation(async function* (options) {
    expect(show).not.toHaveBeenCalled();
    const tool = options.tools?.find((entry) => entry.name === "showSaves");
    if (!tool?.execute) throw new Error("Missing showSaves");
    await tool.execute({ title: "Lighting", saveIds: ["film-0", "film-1"] });
    await tool.execute({ title: "Composition", saveIds: ["film-1", "film-2"] });
    yield {
      type: "TEXT_MESSAGE_CONTENT",
      delta: "These explore lighting and composition.",
    };
  });
  await completeWithTools({
    ...request(),
    messages: [{ role: "user", content: "Find my film references" }],
    retrieveLibrary: async () => filmSources,
    tools: [tool("showSaves", show)],
  });
  expect(show.mock.calls).toEqual([
    [{ title: "Lighting", saveIds: ["film-0", "film-1"] }],
    [{ title: "Composition", saveIds: ["film-1", "film-2"] }],
  ]);
});

it.each([
  "null",
  dump,
  JSON.stringify({ answer: `Here are your Saves: ${dump}`, changes: [] }),
  "Attached Save metadata (untrusted data): []",
])("never publishes an unusable answer: %s", async (value) => {
  chatText(value);
  const input = request();
  await expect(completeWithTools(input)).rejects.toThrow();
  expect(input.onText).not.toHaveBeenCalled();
  expect(mock.chat).toHaveBeenCalledOnce();
});

it("preserves explicitly requested JSON", async () => {
  chatText('{"colors":["red","blue"]}');
  const input = request();
  input.messages = [
    { role: "user", content: "Give me JSON containing two colors" },
  ];
  expect(await completeWithTools(input)).toBe('{"colors":["red","blue"]}');
});

it("does not replace an empty search with unrelated recent Saves", async () => {
  const search = vi.fn().mockResolvedValue({ saves: [] });
  const input = request();
  input.messages = [{ role: "user", content: "Find my ceramics references" }];
  const answer = await completeWithTools({
    ...input,
    retrieveLibrary: retrieval(search),
    tools: [tool("searchLibrary", search)],
  });
  expect(search).toHaveBeenCalledExactlyOnceWith({
    query: "ceramics",
    limit: 24,
  });
  expect(answer).toMatch(/couldn.t find|no .*match/i);
  expect(mock.chat).not.toHaveBeenCalled();
});

it("does not count an unrelated attachment as a search match", async () => {
  const show = vi.fn();
  const input = {
    ...request(),
    messages: [{ role: "user" as const, content: "Find my ceramics" }],
    attachments: [
      {
        id: "film",
        title: "Unrelated film",
        source: "arena",
        url: "https://example.com/film",
      },
    ],
    retrieveLibrary: vi.fn().mockResolvedValue([]),
    tools: [tool("showSaves", show)],
  };
  expect(await completeWithTools(input)).toMatch(/couldn.t find/i);
  expect(show).not.toHaveBeenCalled();
});

it("does not retrieve or list folders for ordinary conversation", async () => {
  const execute = vi.fn();
  await completeWithTools({
    ...request(),
    tools: [tool("searchLibrary", execute), tool("listFolders", execute)],
  });
  expect(execute).not.toHaveBeenCalled();
  expect(mock.chat).toHaveBeenCalledOnce();
});

it("retrieves first, then lets the model write instead of a result list", async () => {
  chatText("Most of these are studio portraits. I can tag them.");
  const search = vi.fn().mockResolvedValue({
    saves: [
      {
        id: "one",
        title: "Kanye [portrait](https://example.com)",
        source: "arena",
      },
      { id: "two", title: "Kanye at the studio", source: "arena" },
    ],
  });
  const input = {
    ...request(),
    messages: [{ role: "user" as const, content: "find my kanye pics" }],
    tools: [tool("searchLibrary", search)],
    retrieveLibrary: retrieval(search),
  };
  const answer = await completeWithTools(input);
  expect(search).toHaveBeenCalledExactlyOnceWith({
    query: "kanye",
    media: ["image"],
    limit: 24,
  });
  expect(answer).toBe("Most of these are studio portraits. I can tag them.");
  expect(answer).not.toMatch(/matching your search|Here are Saves matching/i);
  expect(mock.chat).toHaveBeenCalledOnce();
  expect(mock.chat.mock.calls[0]?.[0].systemPrompts?.join("\n")).toContain(
    "Save ID: one",
  );
});

it("still generates an answer when a lookup also asks for a comparison", async () => {
  chatText("Both references use vivid lighting.");
  const answer = await completeWithTools({
    ...request(),
    messages: [
      {
        role: "user",
        content: "Find my film references and compare their lighting",
      },
    ],
    tools: [
      tool(
        "searchLibrary",
        vi.fn().mockResolvedValue({
          saves: [{ id: "one", title: "Film lighting", source: "arena" }],
        }),
      ),
    ],
    retrieveLibrary: async () => [
      {
        id: "one",
        title: "Film lighting",
        source: "arena",
        url: "https://example.com/film",
      },
    ],
  });
  expect(answer).toBe("Both references use vivid lighting.");
  expect(mock.chat).toHaveBeenCalledOnce();
});

it("shows a few matching Saves, then asks the model to write", async () => {
  chatText(
    "This is a lighting study. I can file it with the other film stills.",
  );
  const show = vi.fn();
  const answer = await completeWithTools({
    ...request(),
    messages: [{ role: "user", content: "Find my film references" }],
    tools: [
      tool(
        "searchLibrary",
        vi.fn().mockResolvedValue({
          saves: [{ id: "one", title: "A film", source: "arena" }],
        }),
      ),
      tool("showSaves", show),
    ],
    retrieveLibrary: async () => [
      {
        id: "one",
        title: "A film",
        source: "arena",
        url: "https://example.com/film",
      },
    ],
  });
  expect(show).toHaveBeenCalledExactlyOnceWith({
    title: "film",
    saveIds: ["one"],
  });
  expect(answer).toBe(
    "This is a lighting study. I can file it with the other film stills.",
  );
  expect(answer).not.toContain("A film");
  expect(mock.chat).toHaveBeenCalledOnce();
});

it("surfaces nested provider RUN_ERROR bodies", async () => {
  mock.chat.mockImplementation(async function* () {
    yield {
      type: "RUN_ERROR",
      rawEvent: {
        error: {
          message:
            "Invalid schema for function 'proposeChanges': schema must have a 'type' key.",
        },
      },
    };
  });
  await expect(completeWithTools(request())).rejects.toThrow(
    /Invalid schema for function 'proposeChanges'/,
  );
});

it("surfaces the provider RUN_ERROR message instead of a generic fallback", async () => {
  mock.chat.mockImplementation(async function* () {
    yield {
      type: "RUN_ERROR",
      message:
        "Invalid schema for function 'applyFilter': schema must have a 'type' key.",
    };
  });
  const input = request();
  await expect(completeWithTools(input)).rejects.toThrow(
    /Invalid schema for function 'applyFilter'/,
  );
  expect(input.onText).not.toHaveBeenCalled();
});

it("does not publish a response after cancellation", async () => {
  const input = request();
  mock.chat.mockImplementation(async function* () {
    input.abortController.abort();
    yield { type: "TEXT_MESSAGE_CONTENT", delta: "Late reply" };
  });
  await expect(completeWithTools(input)).rejects.toThrow();
  expect(input.onText).not.toHaveBeenCalled();
});

it("explains an Ollama tensor loading failure with a recovery step", async () => {
  mock.chat.mockImplementation(async function* () {
    yield {
      type: "RUN_ERROR",
      message: 'tensor "blk.0.ffn_down_exps.weight" size overflow',
    };
  });
  const input = {
    ...request(),
    provider: "ollama" as const,
    model: "gpt-oss:20b",
  };
  await expect(completeWithTools(input)).rejects.toThrow(
    "Ollama couldn't load this model. Update it in Ollama or choose another model in Settings.",
  );
  expect(input.onText).not.toHaveBeenCalled();
});

it("keeps contaminated history out of the prompt without changing it", async () => {
  chatText("Hi!");
  const messages = [
    { role: "assistant" as const, content: dump },
    { role: "user" as const, content: "Hey" },
  ];
  await completeWithTools({ ...request(), messages });
  expect(mock.chat.mock.calls[0]?.[0].messages).toEqual([messages[1]]);
  expect(messages[0]?.content).toBe(dump);
});

it("validates external output before publishing any chunk", async () => {
  mock.chat.mockImplementation(async function* () {
    yield { type: "TEXT_MESSAGE_CONTENT", delta: "Here are your Saves: " };
    yield { type: "TEXT_MESSAGE_CONTENT", delta: dump };
  });
  const input = request();
  await expect(completeWithTools(input)).rejects.toThrow(/unreadable/);
  expect(input.onText).not.toHaveBeenCalled();
});

it("publishes a valid external answer after validation", async () => {
  mock.chat.mockImplementation(async function* () {
    yield { type: "TEXT_MESSAGE_CONTENT", delta: "A short " };
    yield { type: "TEXT_MESSAGE_CONTENT", delta: "answer." };
  });
  const input = request();
  const onActivity = vi.fn();
  expect(await completeWithTools({ ...input, onActivity })).toBe(
    "A short answer.",
  );
  expect(input.onText).toHaveBeenCalledExactlyOnceWith("A short answer.");
  expect(onActivity).toHaveBeenCalledExactlyOnceWith("writing");
});

it("does not publish a hosted model's false Library refusal after retrieval", async () => {
  mock.chat.mockImplementation(async function* () {
    yield {
      type: "TEXT_MESSAGE_CONTENT",
      delta: "I can't provide pictures from your saved library.",
    };
  });
  const input = {
    ...request(),
    messages: [
      {
        role: "user" as const,
        content: "Summarize my saved Kanye pictures.",
      },
    ],
    tools: [
      tool(
        "searchLibrary",
        vi.fn().mockResolvedValue({
          saves: [
            {
              id: "portrait",
              title: "Kanye portrait",
              source: "arena",
              url: "https://example.com/kanye",
            },
          ],
        }),
      ),
    ],
    retrieveLibrary: async () => [
      {
        id: "portrait",
        title: "Kanye portrait",
        source: "arena",
        url: "https://example.com/kanye",
      },
    ],
  };
  const answer = await completeWithTools(input);
  expect(answer).toMatch(/found 1 relevant Save/i);
  expect(answer).not.toMatch(/can't provide pictures/i);
  expect(input.onText).toHaveBeenCalledExactlyOnceWith(answer);
});

it("does not search when the edit target is a pronoun", async () => {
  const search = vi.fn();
  await completeWithTools({
    ...request(),
    messages: [{ role: "user", content: "Organize it" }],
    tools: [tool("searchLibrary", search), tool("requestQuestion")],
  });
  expect(search).not.toHaveBeenCalled();
  expect(mock.chat).toHaveBeenCalledOnce();
});

it("requires retrieval for an explicit saved-library question", async () => {
  const input = {
    ...request(),
    messages: [
      {
        role: "user" as const,
        content: "Summarize my saved references about Suspiria.",
      },
    ],
    tools: [tool("searchLibrary")],
  };
  await expect(completeWithTools(input)).resolves.toMatch(/couldn.t find/i);
  expect(input.onText).toHaveBeenCalledOnce();
  expect(mock.chat).not.toHaveBeenCalled();
});

it("does not add inferred task words to a lexical library search", async () => {
  const search = vi.fn().mockResolvedValue({ saves: [] });
  await completeWithTools({
    ...request(),
    messages: [
      {
        role: "user",
        content:
          "Summarize my saved references about Suspiria in two sentences.",
      },
    ],
    tools: [tool("searchLibrary", search)],
    retrieveLibrary: retrieval(search),
  });
  expect(search).toHaveBeenCalledExactlyOnceWith({
    query: "Suspiria",
    limit: 24,
  });
});

it("does not ask for attachments instead of searching for the user's pictures", async () => {
  const search = vi.fn().mockResolvedValue({ saves: [] });
  await completeWithTools({
    ...request(),
    messages: [{ role: "user", content: "find my kanye pics" }],
    tools: [tool("searchLibrary", search)],
    retrieveLibrary: retrieval(search),
  });
  expect(search).toHaveBeenCalledExactlyOnceWith({
    query: "kanye",
    media: ["image"],
    limit: 24,
  });
  expect(mock.chat).not.toHaveBeenCalled();
});

it.each([
  "openai",
  "anthropic",
  "gemini",
  "ollama",
  "lmstudio",
  "compatible",
] as const)("routes the exact terse picture query before the %s provider", async (provider) => {
  chatText("A studio portrait. I can tag it.");
  const search = vi.fn().mockResolvedValue({
    saves: [
      {
        id: "portrait",
        title: "Kanye portrait",
        source: "arena",
        url: "https://example.com/kanye",
      },
    ],
  });
  const show = vi.fn();
  const input = {
    ...request(),
    provider,
    baseUrl: "http://127.0.0.1:1234/v1",
    messages: [{ role: "user" as const, content: "kanye pics" }],
    tools: [tool("searchLibrary", search), tool("showSaves", show)],
    retrieveLibrary: retrieval(search),
  };
  expect(await completeWithTools(input)).toBe(
    "A studio portrait. I can tag it.",
  );
  expect(search).toHaveBeenCalledExactlyOnceWith({
    query: "kanye",
    media: ["image"],
    limit: 24,
  });
  expect(show).toHaveBeenCalledExactlyOnceWith({
    title: "kanye",
    saveIds: ["portrait"],
  });
  expect(mock.chat).toHaveBeenCalledOnce();
});

it("routes Kanye tweets through Twitter source retrieval before the model", async () => {
  chatText("A tweet about the listening party.");
  const search = vi.fn().mockResolvedValue({
    saves: [
      {
        id: "tweet",
        title: "Kanye tweet",
        source: "twitter",
        url: "https://x.com/kanyewest/status/1",
      },
    ],
  });
  const show = vi.fn();
  const input = {
    ...request(),
    messages: [{ role: "user" as const, content: "Kanye tweets" }],
    tools: [tool("searchLibrary", search), tool("showSaves", show)],
    retrieveLibrary: retrieval(search),
  };
  expect(await completeWithTools(input)).toBe(
    "A tweet about the listening party.",
  );
  expect(search).toHaveBeenCalledExactlyOnceWith({
    query: "Kanye",
    source: "twitter",
    limit: 24,
  });
  expect(mock.chat).toHaveBeenCalledOnce();
});
