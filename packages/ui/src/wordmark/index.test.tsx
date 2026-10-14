import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Wordmark } from ".";

describe("Wordmark", () => {
  it("names the lockup once, through the text beside the mark", () => {
    const markup = renderToStaticMarkup(<Wordmark />);

    expect(markup).toContain("Pond</span>");
    expect(markup).toContain('aria-hidden="true"');
  });

  it("scales the name from the mark size", () => {
    const markup = renderToStaticMarkup(<Wordmark size={24} />);

    expect(markup).toContain("--wordmark-size:24px");
    expect(markup).toContain('width="24"');
  });
});
