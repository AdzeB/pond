import {
  type LibraryNav,
  libraryChrome,
} from "@/features/library/state/library-chrome";
import { resetFilters } from "@/features/library/state/view-store";
import { getAppRouter } from "@/shared/lib/app-router";

export function goToLibraryPath(path: string): void {
  getAppRouter()?.history.push(path);
}

export function selectLibraryNav(nav: LibraryNav): void {
  if (nav.kind !== "all") resetFilters();
  libraryChrome.setNav(nav);
  if (nav.kind === "trash") goToLibraryPath("/trash");
  else if (nav.kind === "downloads") goToLibraryPath("/downloads");
  else if (nav.kind === "sources") goToLibraryPath("/sources");
  else if (nav.kind === "recents") goToLibraryPath("/recents");
  else if (nav.kind === "recentlyAdded") goToLibraryPath("/recently-added");
  else goToLibraryPath("/");
}
