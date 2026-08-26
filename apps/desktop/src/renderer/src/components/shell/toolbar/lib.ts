import { getAppRouter } from "@/lib/ui/app-router";
import { openSave } from "@/lib/ui/save-nav";

export type { StatusEntity } from "@/lib/status-feed";

export function openSources(): void {
  void getAppRouter()?.navigate({ to: "/sources" });
}

export function openSaveFromPanel(id: string): void {
  openSave(id);
}

export type Panel = "progress" | "recent" | "errors" | "ongoing";

export function bindPanel(
  onOpenChange: (next: Panel | null) => void,
  id: Panel,
): (open: boolean) => void {
  return (open) => onOpenChange(open ? id : null);
}

export function closeThen(
  onOpenChange: (next: Panel | null) => void,
  action: () => void,
): () => void {
  return () => {
    onOpenChange(null);
    action();
  };
}
