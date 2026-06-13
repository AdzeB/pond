// Shared id for the toolbar search field so other surfaces can focus it without a ref.
export const SEARCH_INPUT_ID = "library-search-input";

export function focusSearchInput(): void {
  const el = document.getElementById(SEARCH_INPUT_ID);
  if (el instanceof HTMLInputElement) {
    el.focus();
    el.select();
  }
}
