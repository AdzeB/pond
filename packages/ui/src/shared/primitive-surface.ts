import type { ComponentProps, ComponentType, ElementType } from "react";

export type PrimitiveSurface<Namespace> = {
  [Part in keyof Namespace]: Namespace[Part] extends ElementType
    ? ComponentType<ComponentProps<Namespace[Part]>>
    : Namespace[Part];
};
