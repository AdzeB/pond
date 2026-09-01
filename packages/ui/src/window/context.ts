import { createContext, use } from "react";

export type WindowEdge = "top" | "left" | "right" | "bottom";
export type WindowTrackEdge = "left" | "right";

export interface WindowTrackResize {
  minWidth: number;
  maxWidth: number;
  defaultWidth?: number;
  resizeLabel?: string;
  onResize?: (width: number) => void;
  onCollapse?: () => void;
}

export interface WindowContextValue {
  state: Record<WindowEdge, boolean>;
  resize: Record<WindowTrackEdge, WindowTrackResize | null>;
  actions: {
    setOpen: (edge: WindowEdge, open: boolean) => void;
    setResize: (edge: WindowTrackEdge, value: WindowTrackResize | null) => void;
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
