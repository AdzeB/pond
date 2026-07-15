import { createContext, use } from "react";

export interface TrayCardContextValue {
  actions: {
    dismiss: () => void;
  };
}

export const TrayCardContext = createContext<TrayCardContextValue | null>(null);

export function useTrayCard(): TrayCardContextValue {
  const context = use(TrayCardContext);
  if (!context) {
    throw new Error(
      "TrayCard.* parts must be rendered inside <TrayCard.Provider>",
    );
  }
  return context;
}
