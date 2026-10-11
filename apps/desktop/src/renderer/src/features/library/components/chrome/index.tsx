import {
  FilterBar,
  FilterToggle,
} from "@/features/library/components/filter-menu";
import { ViewMenu } from "@/features/library/components/view-menu";
import { SearchComposer } from "@/features/search";
import { SearchChrome } from "@/shared/components/search-chrome";

export function LibraryChrome() {
  return (
    <SearchChrome.Root
      actions={
        <>
          <FilterToggle />
          <ViewMenu />
        </>
      }
      below={<FilterBar />}
    >
      <SearchComposer />
    </SearchChrome.Root>
  );
}
