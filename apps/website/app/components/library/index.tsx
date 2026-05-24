import { FilterBar } from "../_fragments/filter-bar";
import { JustifiedGrid } from "../_fragments/justified-grid";
import { Section } from "../_primitives/section";
import styles from "./styles.module.css";

const CHIPS = [
  { label: "All", count: 1248, active: true },
  { label: "Image", count: 612 },
  { label: "Video", count: 184 },
  { label: "Article", count: 308 },
  { label: "Untagged", count: 92 },
];

export function Library() {
  return (
    <Section.Root id="library">
      <Section.Header>
        <Section.Eyebrow>Library</Section.Eyebrow>
        <Section.Title>Browse by feel, find by name.</Section.Title>
        <Section.Lead>
          Sort, filter, group, and tag every save in your library.
        </Section.Lead>
      </Section.Header>
      <Section.Grid>
        <Section.Card span={8} spanMd={6} padded={false}>
          <div className={styles["feature-fragment"]}>
            <FilterBar chips={CHIPS} total={1248} />
            <div className={styles["feature-grid"]}>
              <JustifiedGrid count={12} rowHeight={104} seedOffset={11} />
            </div>
          </div>
          <div className={styles["feature-body"]}>
            <h3 className={styles["feature-title"]}>Justified grid</h3>
            <p className={styles["feature-description"]}>
              Thumbnails that keep their aspect, arranged by row.
            </p>
          </div>
        </Section.Card>
        <div className={styles["sub-column"]}>
          <Section.Card
            span={4}
            spanMd={6}
            title="Filter bar"
            description="Stack source, kind, tag, and date filters. The bar remembers what you used."
          />
          <Section.Card
            span={4}
            spanMd={6}
            title="Tags & groups"
            description="Tag any save. Group tags that belong together. Rename without breaking links."
          />
          <Section.Card
            span={4}
            spanMd={6}
            title="Inspector"
            description="Open any save to see its source, dimensions, captured date, and tags."
          />
          <Section.Card
            span={4}
            spanMd={6}
            title="Recents & pins"
            description="Recent saves stay one click away. Pin a filter to keep it at the top."
          />
        </div>
      </Section.Grid>
    </Section.Root>
  );
}
