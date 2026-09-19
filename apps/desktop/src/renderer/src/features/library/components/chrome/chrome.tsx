import {
  FilterBar,
  FilterToggle,
} from "@/features/library/components/filter-menu";
import { ViewMenu } from "@/features/library/components/view-menu";
import { SearchComposer } from "@/features/search/components/bar";
import { SearchChrome } from "@/shared/components/search-chrome";

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
