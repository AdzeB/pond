export const SEARCH_INPUT_ID = "library-search-input";

export function focusSearchInput(): void {
  const el = document.getElementById(SEARCH_INPUT_ID);
  if (el instanceof HTMLInputElement) {
    el.focus();
    el.select();
  }
}
