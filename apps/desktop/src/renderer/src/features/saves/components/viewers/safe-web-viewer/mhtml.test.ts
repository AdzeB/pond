import { describe, expect, it } from "vitest";
import { parseMhtml } from "./mhtml";

describe("parseMhtml", () => {
  it("extracts archived pages and embeds referenced resources", () => {
    const source = `Content-Type: multipart/related; boundary="pond"

--pond
Content-Type: text/html; charset=utf-8
Content-Location: https://example.com/

<html><img src="cid:image"></html>
--pond
Content-Type: image/png
Content-Transfer-Encoding: base64
Content-ID: <image>

aGVsbG8=
--pond--`;
    expect(parseMhtml(source)).toEqual([
      {
        label: "https://example.com/",
        html: expect.stringContaining("data:image/png;base64,aGVsbG8="),
      },
    ]);
  });
});
