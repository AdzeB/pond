import { describe, expect, it } from "vitest";
import { parseMymindCards } from "./mymind-import";

describe("parseMymindCards", () => {
  it("reads notes, links, and tags from a mymind cards.csv", () => {
    const cards = parseMymindCards(
      [
        "id,type,title,url,content,note,tags,created",
        'card-1,note,"A title, with a comma",,,"Line one\nLine two","design, #archive",2024-03-01T12:00:00.000Z',
        "card-2,bookmark,Docs,https://pond.so,Body text,,,",
      ].join("\n"),
    );

    expect(cards).toEqual([
      {
        id: "card-1",
        title: "A title, with a comma",
        url: "",
        content: "",
        note: "Line one\nLine two",
        tags: ["design", "archive"],
        created: new Date("2024-03-01T12:00:00.000Z"),
      },
      {
        id: "card-2",
        title: "Docs",
        url: "https://pond.so",
        content: "Body text",
        note: "",
        tags: [],
        created: null,
      },
    ]);
  });

  it("rejects a file that is not a mymind export", () => {
    expect(parseMymindCards("name,email\nAda,ada@example.com")).toBeNull();
  });
});
