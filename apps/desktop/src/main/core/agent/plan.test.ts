import { describe, expect, it } from "vitest";
import { planAssistantTurn } from "./plan";

describe("planAssistantTurn", () => {
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
