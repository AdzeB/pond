export function focusInput(el: HTMLInputElement | null): void {
  if (!el) return;
  el.focus();
  el.select();
}
