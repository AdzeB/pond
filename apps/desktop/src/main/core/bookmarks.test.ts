import { describe, expect, it } from "vitest";
import { parseNetscapeBookmarks } from "./bookmarks";

describe("parseNetscapeBookmarks", () => {
  it("reads http(s) links from a Netscape bookmark file", () => {
    const html = `
      <!DOCTYPE NETSCAPE-Bookmark-file-1>
      <DL>
        <DT><A HREF="https://example.com/one">One</A>
        <DT><A HREF="http://example.com/two">Two</A>
        <DT><A HREF="https://example.com/one">Duplicate</A>
        <DT><A HREF="javascript:void(0)">Skip</A>
        <DT><A HREF="file:///tmp/local">Skip file</A>
      </DL>
    `;
    expect(parseNetscapeBookmarks(html)).toEqual([
      "https://example.com/one",
      "http://example.com/two",
    ]);
  });
});
