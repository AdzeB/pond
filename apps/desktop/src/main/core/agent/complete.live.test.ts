import { homedir } from "node:os";
import { join } from "node:path";
import { expect, it, vi } from "vitest";
import { z } from "zod";
import { completeWithTools } from "./complete";

function retrieval(
  search: (input: Record<string, unknown>) => Promise<unknown>,
) {
  return async (input: Record<string, unknown>) => {
    const result = (await search(input)) as { saves?: never[] } | undefined;
    return result?.saves ?? [];
  };
}

vi.mock("electron", () => ({
  app: {
    getPath: () => join(homedir(), "Library", "Application Support", "Pond"),
  },
}));

it.skipIf(!process.env.POND_LIVE)(
  "Minnow answers a greeting without reading unrelated Saves",
  async () => {
    const search = vi.fn().mockResolvedValue({
      saves: Array.from({ length: 8 }, (_, i) => ({
        id: `video-${i}`,
        title: `Sports video ${i}`,
        url: `https://example.com/video/${i}`,
        source: "youtube",
        description:
          "A discussion of this season's basketball games.\\nShow transcript\\nSubscribe\\n".repeat(
            20,
          ),
      })),
    });
    const answer = await completeWithTools({
      provider: "minnow",
      model: "minnow",
      apiKey: null,
      messages: [{ role: "user", content: "Hey" }],
      context: "Library",
      tools: [
        {
          name: "searchLibrary",
          description: "Search",
          schema: z.object({}),
          execute: search,
        },
      ],
      retrieveLibrary: retrieval(search),
      abortController: new AbortController(),
      onText: vi.fn(),
    });
    expect(answer).toMatch(/hey|hi|hello|how|welcome|help/i);
    expect(answer.length).toBeLessThan(300);
    expect(answer).not.toMatch(/Sports video|transcript|"saves"|"id"/);
    expect(search).not.toHaveBeenCalled();
  },
  120_000,
);

it.skipIf(!process.env.POND_LIVE)(
  "Minnow answers from Save metadata without dumping its context",
  async () => {
    const saves = [
      {
        id: "film-1",
        source: "arena",
        title: "Suspiria",
        description: "A film known for vivid red lighting.",
        url: "https://example.com/suspiria",
      },
      {
        id: "film-2",
        source: "arena",
        title: "Under the Skin",
        description: "A film known for eerie imagery and stark lighting.",
        url: "https://example.com/under-the-skin",
      },
    ];
    const onText = vi.fn();
    const answer = await completeWithTools({
      provider: "minnow",
      model: "minnow",
      apiKey: null,
      messages: [
        {
          role: "user",
          content:
            "In one sentence, what do these two film references have in common?",
        },
      ],
      context: "Library",
      attachments: saves,
      tools: [
        {
          name: "searchLibrary",
          description: "Search",
          schema: z.object({}),
          execute: async () => ({ saves }),
        },
      ],
      retrieveLibrary: async () => saves,
      abortController: new AbortController(),
      onText,
    });
    expect(answer.length).toBeGreaterThan(20);
    expect(answer.length).toBeLessThan(700);
    expect(answer).toMatch(/light|visual|imagery|atmospher|color/i);
    expect(answer).not.toMatch(
      /untrusted data|Available Saves|"saves"|"answer"/,
    );
    expect(onText).toHaveBeenCalledWith(answer);
  },
  120_000,
);

it.skipIf(!process.env.POND_LIVE)(
  "Minnow summarizes noisy retrieved metadata",
  async () => {
    const search = vi.fn().mockResolvedValue({
      saves: [
        {
          id: "film",
          title: "Suspiria lighting study",
          source: "arena",
          url: "https://example.com",
          description:
            "Suspiria uses vivid red and blue lighting to create an unsettling atmosphere.\\nShow transcript\\nSubscribe\\n".repeat(
              20,
            ),
        },
      ],
    });
    const answer = await completeWithTools({
      provider: "minnow",
      model: "minnow",
      apiKey: null,
      context: "Library",
      messages: [
        {
          role: "user",
          content:
            "Summarize my saved Suspiria lighting reference in two sentences.",
        },
      ],
      tools: [
        {
          name: "searchLibrary",
          description: "Search",
          schema: z.object({}),
          execute: search,
        },
      ],
      retrieveLibrary: retrieval(search),
      abortController: new AbortController(),
      onText: vi.fn(),
    });
    expect(search).toHaveBeenCalledTimes(1);
    expect(answer).toMatch(/red|blue|light/i);
    expect(answer.length).toBeLessThan(800);
    expect(answer).not.toMatch(/Show transcript|Subscribe|\\n|"id"|"saves"/);
  },
  120_000,
);

it.skipIf(!process.env.POND_LIVE)(
  "Minnow reports no search matches without a recent fallback",
  async () => {
    const search = vi.fn().mockResolvedValue({ saves: [] });
    const answer = await completeWithTools({
      provider: "minnow",
      model: "minnow",
      apiKey: null,
      context: "Library",
      messages: [
        { role: "user", content: "Find my saved ceramics references." },
      ],
      tools: [
        {
          name: "searchLibrary",
          description: "Search",
          schema: z.object({}),
          execute: search,
        },
      ],
      retrieveLibrary: retrieval(search),
      abortController: new AbortController(),
      onText: vi.fn(),
    });
    expect(search).toHaveBeenCalledTimes(1);
    expect(search.mock.calls[0]?.[0].query).toMatch(/ceramic/i);
    expect(answer).toMatch(/couldn.t find/);
  },
  120_000,
);

it.skipIf(!process.env.POND_LIVE)(
  "Minnow asks a structured question for an unspecified task",
  async () => {
    const question = vi.fn().mockResolvedValue({ requested: true });
    const search = vi.fn();
    await completeWithTools({
      provider: "minnow",
      model: "minnow",
      apiKey: null,
      context: "Library",
      messages: [{ role: "user", content: "Organize it" }],
      tools: [
        {
          name: "searchLibrary",
          description: "Search",
          schema: z.object({}),
          execute: search,
        },
        {
          name: "requestQuestion",
          description: "Question",
          schema: z.object({}),
          execute: question,
        },
      ],
      retrieveLibrary: retrieval(search),
      abortController: new AbortController(),
      onText: vi.fn(),
    });
    expect(search).not.toHaveBeenCalled();
    expect(question).toHaveBeenCalledOnce();
    expect(question.mock.calls[0]?.[0].question).toMatch(/[?？]$/);
    expect(question.mock.calls[0]?.[0]).toMatchObject({
      question: expect.any(String),
      options: expect.any(Array),
    });
  },
  120_000,
);

it.skipIf(!process.env.POND_LIVE)(
  "Minnow attributes saved profile preferences to the profile owner",
  async () => {
    const search = vi.fn().mockResolvedValue({
      saves: [
        {
          id: "profile",
          title: "empressof's profile • Letterboxd",
          source: "arena",
          url: "https://example.com/profile",
          description:
            "empressof uses Letterboxd to share film reviews and lists. 8 films watched. Favorites: Suspiria (1977), There Will Be Blood (2007), A Room with a View (1986), Hunt for the Wilderpeople (2016).",
        },
      ],
    });
    const answer = await completeWithTools({
      provider: "minnow",
      model: "minnow",
      apiKey: null,
      context: "Library",
      messages: [
        {
          role: "user",
          content:
            "Summarize my saved references about Suspiria in two sentences.",
        },
      ],
      tools: [
        {
          name: "searchLibrary",
          description: "Search",
          schema: z.object({}),
          execute: search,
        },
      ],
      retrieveLibrary: retrieval(search),
      abortController: new AbortController(),
      onText: vi.fn(),
    });
    expect(answer).toMatch(/profile|empressof/i);
    expect(answer).toMatch(/Suspiria/i);
    expect(answer).not.toMatch(
      /you (?:have )?(?:watched|listed)|your favorite|Source:|Description:/i,
    );
    expect(answer.length).toBeLessThan(600);
  },
  120_000,
);

it.skipIf(!process.env.POND_LIVE)(
  "Minnow searches for my pictures without asking for attachments",
  async () => {
    const search = vi.fn().mockResolvedValue({
      saves: [
        { id: "portrait", title: "Kanye portrait", source: "arena" },
        { id: "studio", title: "Kanye in the studio", source: "arena" },
      ],
    });
    const answer = await completeWithTools({
      provider: "minnow",
      model: "minnow",
      apiKey: null,
      context: "Library",
      messages: [{ role: "user", content: "find my kanye pics" }],
      tools: [
        {
          name: "searchLibrary",
          description: "Search",
          schema: z.object({}),
          execute: search,
        },
      ],
      retrieveLibrary: retrieval(search),
      abortController: new AbortController(),
      onText: vi.fn(),
    });
    expect(search).toHaveBeenCalledOnce();
    expect(search.mock.calls[0]?.[0].query).toBe("kanye");
    expect(answer).toContain("[Kanye portrait](#save-1)");
    expect(answer).toContain("[Kanye in the studio](#save-2)");
  },
  120_000,
);
