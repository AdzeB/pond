import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Tabs } from ".";

describe("Tabs", () => {
  it("renders Base UI tabs with shared Pond styling hooks", () => {
    const markup = renderToStaticMarkup(
      <Tabs.Root defaultValue="first">
        <Tabs.List aria-label="Example tabs">
          <Tabs.Tab value="first" icon aria-label="First">
            First icon
          </Tabs.Tab>
          <Tabs.Tab value="second">Second</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="first">First panel</Tabs.Panel>
        <Tabs.Panel value="second">Second panel</Tabs.Panel>
      </Tabs.Root>,
    );

    expect(markup).toContain('role="tablist"');
    expect(markup).toContain('role="tab"');
    expect(markup).toContain('role="tabpanel"');
    expect(markup).toContain('data-icon="true"');
    expect(markup).toContain('aria-label="First"');
  });
});
