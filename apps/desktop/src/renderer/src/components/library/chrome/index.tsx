import { IconMagnifierOutline18 } from "@pond/icons/outline/18";
import { FilterBar, FilterToggle } from "@/components/library/filter-menu";
import { ViewMenu } from "@/components/library/view-menu";
import { SearchComposer } from "@/components/search/bar";
import styles from "./styles.module.css";

export function LibraryChrome() {
  return (
    <div className={styles.root}>
      <div className={styles.bar}>
        <span className={styles.mark} aria-hidden>
          <IconMagnifierOutline18 />
        </span>
        <SearchComposer />
        <div className={styles.actions}>
          <FilterToggle />
          <ViewMenu />
        </div>
      </div>
      <FilterBar />
    </div>
  );
}
