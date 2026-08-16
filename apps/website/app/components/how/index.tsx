import { FinderStatic } from "../_mocks/finder-static";
import { SaveStatic } from "../_mocks/save-static";
import { SearchStatic } from "../_mocks/search-static";
import { Section } from "../_primitives/section";
import styles from "./styles.module.css";

export function How() {
  return (
    <Section.Root id="product" className={styles.root}>
      <Section.Header align="start">
        <Section.Title>
          Pond saves <sup className={styles.mark}>01</sup> from anywhere, finds{" "}
          <sup className={styles.mark}>02</sup> anything you kept, and stores{" "}
          <sup className={styles.mark}>03</sup> it in a folder you own.
        </Section.Title>
      </Section.Header>
      <Section.Grid>
        <Section.Card
          span={4}
          surface="plain"
          index="01"
          title="Save from anywhere"
          description="One keystroke in the browser sends the page to your library, full media and metadata included."
          fragment={<SaveStatic />}
        />
        <Section.Card
          span={4}
          surface="plain"
          index="02"
          title="Find anything"
          description="Full-text search, stacking filter tokens, and plain-language questions through AI providers you configure."
          fragment={<SearchStatic />}
        />
        <Section.Card
          span={4}
          surface="plain"
          index="03"
          title="A folder you own"
          description="Everything lives in ~/Pond/My Pond.pond. Back it up, move it, or browse it in Finder."
          fragment={<FinderStatic />}
        />
      </Section.Grid>
    </Section.Root>
  );
}
