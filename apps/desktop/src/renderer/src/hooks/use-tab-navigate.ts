import { tabs } from "@/stores/tabs";

/** Meta/ctrl opens a background tab; otherwise runs the in-tab fallback. */
export function openInNewTabIfMeta(
  e: React.MouseEvent | MouseEvent,
  path: string,
  fallback: () => void,
): void {
  if (e.metaKey || e.ctrlKey) {
    e.preventDefault();
    e.stopPropagation();
    tabs.open(path, { background: true });
  } else {
    fallback();
  }
}
