import { createContext, use } from "react";

export interface PageDialogContextValue {
  pageId: string;
  depth: number;
  deeper: boolean;
  reduceMotion: boolean;
  setSize: (width: number, height: number) => void;
}

export const PageDialogContext = createContext<PageDialogContextValue | null>(
  null,
);

export function usePageDialog(): PageDialogContextValue {
  const context = use(PageDialogContext);
  if (!context) {
    throw new Error(
      "PageDialog.* parts must be rendered inside PageDialog.Popup",
    );
  }
  return context;
}
