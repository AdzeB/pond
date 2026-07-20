import { DockShowcase } from "../_mocks/dock-showcase";
import { SearchStatic } from "../_mocks/search-static";
import { Section } from "../_primitives/section";

export function Find() {
  return (
    <Section.Root id="find">
      <Section.Header>
        <Section.Eyebrow>Find</Section.Eyebrow>
        <Section.Title>Open the dock. Find anything.</Section.Title>
        <Section.Lead>
          Search lives in a dock at the bottom of the window, one keystroke
          away. Type a word, stack filter tokens, or ask a question.
        </Section.Lead>
      </Section.Header>
      <SearchStatic />
      <Section.Grid>
        <Section.Card
          span={12}
          title="One tray, every control"
          description="The dock is the whole cockpit: new save, layout, zoom, sort, display, search, and Ask. Press a key and it expands in place."
          fragment={<DockShowcase />}
        />
        <Section.Card
          span={4}
          title="Filter tokens"
          description="source:, tag:, kind:, saved:. Tokens combine, and the field autocompletes your own vocabulary."
        />
        <Section.Card
          span={4}
          title="Full-text search"
          description="Search the body of saved articles and posts, not only titles and URLs."
        />
        <Section.Card
          span={4}
          title="Ask"
          description="Questions in plain language, using AI providers you configure with your own keys."
        />
      </Section.Grid>
    </Section.Root>
  );
}
