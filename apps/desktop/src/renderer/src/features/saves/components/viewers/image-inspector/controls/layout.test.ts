import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

const directory = dirname(fileURLToPath(import.meta.url));
const hudCss = readFileSync(
  resolve(directory, "../../hud/styles.module.css"),
  "utf8",
);
const chromeCss = readFileSync(
  resolve(directory, "../../media-viewer/chrome/styles.module.css"),
  "utf8",
);
const controls = readFileSync(resolve(directory, "index.tsx"), "utf8");

it("uses the integrated top toolbar for the image controls", () => {
  expect(controls).toContain('ChromePortal slot="top"');
  expect(controls).toContain("<ViewerHud.Bar");
  expect(controls).toContain("<ViewerToolbarGroups");
  expect(controls).not.toContain("<Tray.Separator");
  expect(controls).toContain("collapseCenter");
  expect(controls).not.toContain("<ViewerHud.Root");
  expect(controls).not.toContain("<ViewerHud.Cluster");
  expect(hudCss).toContain("position: absolute");
  expect(hudCss).toContain("pointer-events: none");
  expect(hudCss).toContain("border-radius: var(--ds-radius-lg)");
  expect(hudCss).toContain("box-shadow: var(--ds-shadow-tooltip)");
  expect(chromeCss).toContain("container-type: inline-size");
  expect(hudCss).toContain("@container (max-width: 620px)");
  expect(hudCss).toMatch(
    /\.bar\[data-collapse-center\] \.center\s*{\s*display: none;/,
  );
  expect(hudCss).toContain(
    "grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr)",
  );
});
