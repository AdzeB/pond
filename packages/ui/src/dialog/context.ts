import { createContext, use } from "react";

export interface DialogPageContextValue {
  pageId: string;
  depth: number;
  deeper: boolean;
  reduceMotion: boolean;
  setSize: (width: number, height: number) => void;
}

export const DialogPageContext = createContext<DialogPageContextValue | null>(
  null,
);

export function useDialogPage(): DialogPageContextValue {
  const context = use(DialogPageContext);
  if (!context) {
    throw new Error(
      "Dialog.Viewport must be rendered inside Dialog.Popup with pageId and depth",
    );
  }
  return context;
}
