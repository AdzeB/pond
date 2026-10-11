import { Settings } from "@pond/ui";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it } from "vitest";
import type { SectionConfig } from "@/features/settings/lib/engine-types";
import { SettingsSectionView } from ".";

it("renders standalone custom surfaces beside row lists instead of nesting them", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  const config: SectionConfig = {
    groups: [
      {
        title: "Example",
        items: [
          {
            control: "switch",
            key: "before",
            title: "Before",
          },
          {
            control: "custom",
            key: "standalone",
            title: "Standalone",
            standalone: true,
            render: () => (
              <Settings.List data-testid="standalone-list">
                <Settings.Item>Nested setting</Settings.Item>
              </Settings.List>
            ),
          },
          {
            control: "switch",
            key: "after",
            title: "After",
          },
        ],
      },
    ],
  };

  try {
    await act(async () => {
      root.render(<SettingsSectionView config={config} sectionId="test" />);
    });

    const before = host.querySelector("#setting-test-before");
    const after = host.querySelector("#setting-test-after");
    const standalone = host.querySelector('[data-testid="standalone-list"]');
    const standaloneAnchor = host.querySelector("#setting-test-standalone");

    expect(before?.parentElement).not.toBe(after?.parentElement);
    expect(standalone?.parentElement).toBe(standaloneAnchor);
    expect(standaloneAnchor?.parentElement).toBe(
      before?.parentElement?.parentElement,
    );
    expect(standaloneAnchor?.parentElement).toBe(
      after?.parentElement?.parentElement,
    );
  } finally {
    await act(async () => root.unmount());
    host.remove();
  }
});
