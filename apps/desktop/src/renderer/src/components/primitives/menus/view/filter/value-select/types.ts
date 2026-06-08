import type { Predicate } from "@pond/schema/filters/types";

export interface BodyProps {
  predicate: Predicate;
  onChange: (next: Predicate) => void;
}
