import { FinderStatic } from "../_mocks/finder-static";
import { Section } from "../_primitives/section";

export function Own() {
  return (
    <Section.Root id="own">
      <Section.Header>
        <Section.Eyebrow>Own</Section.Eyebrow>
        <Section.Title>Local is the source of truth.</Section.Title>
        <Section.Lead>
          Your library is a folder on your Mac. Browse it in Finder: every save
          is a folder with its media and a plain info.json.
        </Section.Lead>
      </Section.Header>
      <FinderStatic />
      <Section.Grid>
        <Section.Card
          span={4}
          title="A folder you own"
          description="Everything lives in ~/Pond/My Pond.pond. Pond reads the folder; the folder is the source of truth."
        />
        <Section.Card
          span={4}
          title="Outlives the original"
          description="When a post is deleted or an account vanishes, your saved copy stays, media and metadata intact."
        />
        <Section.Card
          span={4}
          title="Trash, not delete"
          description="Removed saves move to a trash folder you can recover from. Nothing is gone until you say so."
        />
      </Section.Grid>
    </Section.Root>
  );
}
