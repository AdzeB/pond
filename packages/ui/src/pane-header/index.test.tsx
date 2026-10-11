import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Pane } from ".";

describe("Pane.Header", () => {
  it("groups a pane title and its actions in the shared chrome", () => {
    const markup = renderToStaticMarkup(
      <Pane.Header title="Details">
        <button type="button">Close</button>
      </Pane.Header>,
    );

    expect(markup).toContain('data-slot="pane-header"');
    expect(markup).toContain('data-slot="pane-header-title"');
    expect(markup).toContain('data-slot="pane-header-actions"');
    expect(markup).toContain("Details");
    expect(markup).toContain("Close");
  });
});

describe("Pane.Body", () => {
  it("preserves caller attributes on the shared inset container", () => {
    const markup = renderToStaticMarkup(
      <Pane.Body aria-label="Details content">Content</Pane.Body>,
    );

    expect(markup).toContain('data-slot="pane-body"');
    expect(markup).toContain('aria-label="Details content"');
  });
});
