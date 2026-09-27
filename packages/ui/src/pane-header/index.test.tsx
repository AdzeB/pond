import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PaneBody, PaneHeader } from ".";

describe("PaneHeader", () => {
  it("groups a pane title and its actions in the shared chrome", () => {
    const markup = renderToStaticMarkup(
      <PaneHeader title="Details">
        <button type="button">Close</button>
      </PaneHeader>,
    );

    expect(markup).toContain('data-slot="pane-header"');
    expect(markup).toContain('data-slot="pane-header-title"');
    expect(markup).toContain('data-slot="pane-header-actions"');
    expect(markup).toContain("Details");
    expect(markup).toContain("Close");
  });
});

describe("PaneBody", () => {
  it("preserves caller attributes on the shared inset container", () => {
    const markup = renderToStaticMarkup(
      <PaneBody aria-label="Details content">Content</PaneBody>,
    );

    expect(markup).toContain('data-slot="pane-body"');
    expect(markup).toContain('aria-label="Details content"');
  });
});
