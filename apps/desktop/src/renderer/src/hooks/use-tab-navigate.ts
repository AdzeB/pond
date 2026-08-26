import { tabs } from "@/stores/tabs";

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
