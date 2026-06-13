// Shared id for the toolbar search field so other surfaces (e.g. the bottom
// dock's search button) can focus it without prop-drilling a ref.
export const SEARCH_INPUT_ID = "library-search-input";

export function focusSearchInput(): void {
  const el = document.getElementById(SEARCH_INPUT_ID);
  if (el instanceof HTMLInputElement) {
    el.focus();
    el.select();
  }
}
