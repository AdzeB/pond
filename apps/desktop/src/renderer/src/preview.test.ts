import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const directory = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(resolve(directory, "preview.css"), "utf8");
const entry = readFileSync(resolve(directory, "preview.ts"), "utf8");
const html = readFileSync(resolve(directory, "../preview.html"), "utf8");

describe("detached preview presentation", () => {
  it("uses Pond's renderer foundation and shared control mount", () => {
    expect(css).toContain('@import "./styles.css";');
    expect(entry).toContain('import "./app/boot-shell";');
    expect(html).toContain('<div id="preview-ui"></div>');
    expect(html).not.toContain('<nav aria-label="Preview Controls">');
    expect(html).not.toContain('id="window-close"');
  });

  it("keeps every control legible while the toolbar rests", () => {
    expect(css).not.toMatch(/nav:not\([^}]+\)\s*{[^}]*opacity:/s);
    expect(css).not.toMatch(/\.preview-controls[^}]*opacity:\s*0\.[0-9]+/s);
  });

  it("overlays video controls instead of reserving a second layout row", () => {
    expect(css).not.toMatch(
      /body\[data-media-type="video"\]\s*{[^}]*grid-template-rows:/s,
    );
    expect(css).not.toMatch(
      /body\[data-media-type="video"\]\s+nav\s*{[^}]*position:\s*static/s,
    );
    expect(css).toMatch(
      /\[data-media-type="video"\][^{]*\.preview-controls\s*{[^}]*top:/s,
    );
  });
});
