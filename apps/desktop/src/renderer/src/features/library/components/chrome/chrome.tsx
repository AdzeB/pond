import {
  FilterBar,
  FilterToggle,
} from "@/features/library/components/filter-menu/filter-menu";
import {
  SortMenu,
  ViewMenu,
} from "@/features/library/components/view-menu/view-menu";
import { SearchComposer } from "@/features/search/components/bar/bar";
import { SearchChrome } from "@/shared/components/search-chrome/search-chrome";

export function LibraryChrome() {
  return (
    <SearchChrome
      actions={
        <>
          <FilterToggle />
          <SortMenu />
          <ViewMenu />
        </>
      }
      below={<FilterBar />}
    >
      <SearchComposer />
    </SearchChrome>
  );
}
