import { describe, expect, it } from "vitest";
import { planAssistantTurn } from "./plan";

describe("planAssistantTurn", () => {
  it("keeps the audited multi-sentence request out of search terms", () => {
    expect(
      planAssistantTurn({
        latest:
          "Find three Saves about film or cinematography. Show them as Save results, then give one short sentence about each using only saved information. Only read; do not change anything.",
        hasSearch: true,
      }),
    ).toMatchObject({
      intent: "search",
      query: "film or cinematography",
      requestedCount: 3,
      media: [],
    });
  });

  it.each([
    ["Find one film reference", "film", 1],
    ["Show two film Saves", "film", 2],
    ["Find 3 Saves about architecture", "architecture", 3],
    ["Find three film references and compare their lighting", "film", 3],
    ["Find my film references in two sentences", "film", undefined],
    ["Find 2001: A Space Odyssey", "2001: A Space Odyssey", undefined],
  ] as const)("separates result counts from subject and formatting: %s", (latest, query, requestedCount) => {
    expect(planAssistantTurn({ latest, hasSearch: true })).toMatchObject({
      query,
    });
    expect(planAssistantTurn({ latest, hasSearch: true }).requestedCount).toBe(
      requestedCount,
    );
  });

  it.each([
    ["kanye pics", "kanye", ["image"]],
    ["Kanye photos", "Kanye", ["image"]],
    ["kubrick stuff", "kubrick", []],
    ["find my saved brutalist houses", "brutalist houses", []],
  ] as const)("routes terse Library query %s", (latest, query, media) => {
    expect(planAssistantTurn({ latest, hasSearch: true })).toMatchObject({
      intent: "search",
      query,
      media: [...media],
      requiresEvidence: true,
      directLookup: true,
      edit: false,
    });
  });

  it("maps source nouns onto retrieval filters", () => {
    expect(
      planAssistantTurn({ latest: "Kanye tweets", hasSearch: true }),
    ).toMatchObject({
      intent: "search",
      query: "Kanye",
      source: "twitter",
      media: [],
    });
    expect(
      planAssistantTurn({ latest: "instagram photos", hasSearch: true }),
    ).toMatchObject({
      intent: "search",
      query: "",
      source: "instagram",
      media: ["image"],
    });
    expect(
      planAssistantTurn({ latest: "youtube videos", hasSearch: true }),
    ).toMatchObject({
      intent: "search",
      query: "",
      source: "youtube",
      media: ["video"],
    });
    expect(
      planAssistantTurn({ latest: "tweets", hasSearch: true }),
    ).toMatchObject({
      intent: "search",
      query: "",
      source: "twitter",
    });
  });

  it("turns media nouns into filters instead of lexical terms", () => {
    expect(
      planAssistantTurn({ latest: "recent vids", hasSearch: true }),
    ).toMatchObject({
      intent: "recent",
      query: "",
      media: ["video"],
      requiresEvidence: true,
      directLookup: true,
    });
  });

  it("keeps synthesis requests evidence-required but not lookup-only", () => {
    expect(
      planAssistantTurn({
        latest:
          "Summarize my saved references about Suspiria in two sentences.",
        hasSearch: true,
      }),
    ).toMatchObject({
      intent: "search",
      query: "Suspiria",
      requiresEvidence: true,
      directLookup: false,
    });
  });

  it("uses attachments when the user refers to attached material", () => {
    expect(
      planAssistantTurn({
        latest: "compare these",
        hasSearch: true,
        attachmentCount: 2,
      }),
    ).toMatchObject({
      intent: "attachments",
      requiresEvidence: true,
      directLookup: false,
    });
  });

  it.each([
    "Hey",
    "thanks",
    "Who is Kanye West?",
    "write me a poem",
  ])("does not search ordinary conversation: %s", (latest) => {
    expect(planAssistantTurn({ latest, hasSearch: true })).toMatchObject({
      intent: "chat",
      requiresEvidence: false,
      directLookup: false,
    });
  });

  it("does not claim a search plan when search is unavailable", () => {
    expect(
      planAssistantTurn({ latest: "kanye pics", hasSearch: false }),
    ).toMatchObject({ intent: "chat", requiresEvidence: false });
  });

  it("clarifies a vague edit target instead of searching for a pronoun", () => {
    expect(
      planAssistantTurn({ latest: "Organize it", hasSearch: true }),
    ).toMatchObject({ intent: "clarify", query: "", edit: true });
  });

  it("can plan attachment work even when Library search is unavailable", () => {
    expect(
      planAssistantTurn({
        latest: "Rename this",
        hasSearch: false,
        attachmentCount: 1,
      }),
    ).toMatchObject({ intent: "attachments", edit: true });
  });

  it("keeps organize and import turns on the tool loop", () => {
    expect(
      planAssistantTurn({
        latest: "Create a folder named References",
        hasSearch: true,
      }),
    ).toMatchObject({ intent: "chat", edit: true });
    expect(
      planAssistantTurn({
        latest: "Import https://example.com",
        hasSearch: true,
      }),
    ).toMatchObject({ intent: "chat", edit: true });
  });
});
