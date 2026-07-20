import { LibraryStatic } from "../_mocks/library-static";
import { Section } from "../_primitives/section";

export function Browse() {
  return (
    <Section.Root id="browse">
      <Section.Header>
        <Section.Eyebrow>Browse</Section.Eyebrow>
        <Section.Title>Browse by feel, find by name.</Section.Title>
        <Section.Lead>
          Your library is a place to look at, not a list to scroll. Switch
          layouts, drag the zoom, filter by source.
        </Section.Lead>
      </Section.Header>
      <Section.Grid>
        <Section.Card
          span={4}
          title="Three layouts"
          description="Waterfall, grid, or justified rows. Thumbnails keep their aspect."
          fragment={<LibraryStatic variant="layouts" />}
        />
        <Section.Card
          span={4}
          title="Continuous zoom"
          description="From 80 to 240 pixels, and the columns re-pack as you drag."
          fragment={<LibraryStatic variant="zoom" />}
        />
        <Section.Card
          span={4}
          title="Filters that stack"
          description="Combine source, kind, tag, and date. Pin a filter to keep it one click away."
          fragment={<LibraryStatic variant="filters" />}
        />
      </Section.Grid>
    </Section.Root>
  );
}
