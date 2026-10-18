import { useSelector } from "@tanstack/react-store";
import { Store } from "@tanstack/store";

export type SourceDetailsKind = "account" | "watch" | "folder";

export type SourceDetailsPage = "general" | "import" | "filters";

export type DetailsDialogTarget = {
  kind: "source";
  sourceKind: SourceDetailsKind;
  id: string;
  page?: SourceDetailsPage;
};

const store = new Store<DetailsDialogTarget | null>(null);

export const detailsDialog = {
  getState(): DetailsDialogTarget | null {
    return store.state;
  },
  openSource(
    sourceKind: SourceDetailsKind,
    id: string,
    page?: SourceDetailsPage,
  ): void {
    store.setState(() =>
      page
        ? { kind: "source", sourceKind, id, page }
        : { kind: "source", sourceKind, id },
    );
  },
  close(): void {
    store.setState(() => null);
  },
};

export function useDetailsDialog(): DetailsDialogTarget | null {
  return useSelector(store, (state) => state);
}
