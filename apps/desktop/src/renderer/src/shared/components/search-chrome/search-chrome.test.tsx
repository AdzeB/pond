import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SearchChrome, SearchChromeInput } from ".";
import styles from "./styles.module.css";

const css = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "styles.module.css"),
  "utf8",
);

function declarations(selector: string) {
  const start = css.indexOf(`${selector} {`);
  expect(start).toBeGreaterThanOrEqual(0);
  return css.slice(start, css.indexOf("}", start)).replace(/\s+/g, " ");
}

describe("SearchChromeInput", () => {
  it("uses the shared chrome's layout inset instead of input padding", () => {
    const markup = renderToStaticMarkup(
      <SearchChrome>
        <SearchChromeInput aria-label="Search" />
      </SearchChrome>,
    );

    expect(markup).toContain(styles.input);
    expect(markup).toContain(styles.field);
    expect(markup).not.toContain("<svg");
    expect(declarations(".root")).toContain(
      "--search-chrome-inline-start: 20px;",
    );
    expect(declarations(".bar")).toContain(
      "padding-inline-start: var(--search-chrome-inline-start);",
    );
    expect(declarations(".input > .field")).toContain("padding-inline: 0;");
  });

  it("matches the Library search placeholder emphasis", () => {
    const field = declarations(".input > .field");
    expect(field).toContain("font-weight: 400;");
    expect(declarations(".input > .field::placeholder")).toContain(
      "color: var(--ds-gray-9);",
    );
  });
});
