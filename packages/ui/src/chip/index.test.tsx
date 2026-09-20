import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Chip } from ".";

describe("Chip", () => {
  it("renders applied and suggested actions as buttons", () => {
    const applied = renderToStaticMarkup(
      <Chip.Action tone="applied">Reference</Chip.Action>,
    );
    const suggested = renderToStaticMarkup(
      <Chip.Action tone="suggested">Suggested</Chip.Action>,
    );

    expect(applied).toContain('type="button"');
    expect(applied).toContain('data-tone="applied"');
    expect(suggested).toContain('data-tone="suggested"');
  });

  it("renders file chips as links", () => {
    const markup = renderToStaticMarkup(
      <Chip.Link href="https://example.com/file.pdf">file.pdf</Chip.Link>,
    );

    expect(markup).toContain('href="https://example.com/file.pdf"');
    expect(markup).toContain('data-tone="file"');
  });
});
