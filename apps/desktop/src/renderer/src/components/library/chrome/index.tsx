import { FilterBar, FilterToggle } from "@/components/library/filter-menu";
import { SearchChrome } from "@/components/library/search-chrome";
import { SortMenu, ViewMenu } from "@/components/library/view-menu";
import { SearchComposer } from "@/components/search/bar";

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
