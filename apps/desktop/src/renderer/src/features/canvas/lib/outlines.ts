import {
  IconCircle,
  IconDiamond,
  IconSquare,
  IconSquareRounded,
  IconTriangle,
} from "@pond/icons";
import type { CanvasOutline } from "@shared/canvas-contracts";
import type { ComponentType } from "react";

export const OUTLINES: readonly {
  outline: CanvasOutline;
  label: string;
  Icon: ComponentType<{ size?: number }>;
}[] = [
  { outline: "rectangle", label: "Rectangle", Icon: IconSquare },
  { outline: "rounded", label: "Rounded Rectangle", Icon: IconSquareRounded },
  { outline: "ellipse", label: "Ellipse", Icon: IconCircle },
  { outline: "diamond", label: "Diamond", Icon: IconDiamond },
  { outline: "triangle", label: "Triangle", Icon: IconTriangle },
];
