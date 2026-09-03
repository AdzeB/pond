import { FilterBar, FilterToggle } from "@/components/library/filter-menu";
import { SearchChrome } from "@/components/library/search-chrome";
import { ViewMenu } from "@/components/library/view-menu";
import { SearchComposer } from "@/components/search/bar";

export function LibraryChrome() {
  return (
    <SearchChrome
      actions={
        <>
          <FilterToggle />
          <ViewMenu />
        </>
      }
      below={<FilterBar />}
    >
      <SearchComposer />
    </SearchChrome>
  );
}
