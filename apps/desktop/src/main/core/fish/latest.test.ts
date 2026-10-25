import { describe, expect, it } from "vitest";
import { latestFromMessage, plainPreview } from "./latest";

const createdAt = new Date(5);

describe("plainPreview", () => {
  it("reads markdown as one plain line", () => {
    expect(
      plainPreview(
        "## Done\n\nTagged **3** posters, see [Dune](#save-1).\n\n```js\nx\n```\n- next",
      ),
    ).toBe("Done Tagged 3 posters, see Dune. next");
  });

  it("clips long replies", () => {
    const preview = plainPreview("word ".repeat(80));
    expect(preview.length).toBeLessThanOrEqual(140);
    expect(preview.endsWith("…")).toBe(true);
  });
});

describe("latestFromMessage", () => {
  it("knows who spoke", () => {
    expect(
      latestFromMessage({
        role: "user",
        content: "Tag these",
        metadata: null,
        createdAt,
      }),
    ).toEqual({ from: "you", text: "Tag these", at: 5 });
    expect(
      latestFromMessage({
        role: "user",
        content: "This is your routine.",
        metadata: { routine: { trigger: "schedule" } },
        createdAt,
      }),
    ).toEqual({ from: "routine", text: "", at: 5 });
  });

  it("falls back to proposed changes or the error when a reply has no text", () => {
    const change = {
      id: "c",
      saveId: "s",
      title: "Poster",
      reason: "",
      status: "pending" as const,
      field: "title" as const,
      before: null,
      after: "Poster",
    };
    expect(
      latestFromMessage({
        role: "assistant",
        content: "",
        metadata: { changes: [change, { ...change, id: "d" }] },
        createdAt,
      }).text,
    ).toBe("Proposed 2 changes");
    expect(
      latestFromMessage({
        role: "assistant",
        content: "",
        metadata: { error: "The model is offline." },
        createdAt,
      }).text,
    ).toBe("The model is offline.");
  });
});
