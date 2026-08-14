import { createContext, use } from "react";

export type WindowEdge = "top" | "left" | "right" | "bottom";

export interface WindowContextValue {
  state: Record<WindowEdge, boolean>;
  actions: {
    setOpen: (edge: WindowEdge, open: boolean) => void;
  };
  meta: Record<string, never>;
}

export const WindowContext = createContext<WindowContextValue | null>(null);

export function useWindow(): WindowContextValue {
  const context = use(WindowContext);
  if (!context) {
    throw new Error("Window.* parts must be rendered inside <Window.Root>");
  }
  return context;
}
