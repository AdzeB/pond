/**
 * 12px filled icons. Lucide ships a single base size; the 12 vs 18
 * split is preserved for parity with the legacy icon surface but the
 * components are identical to those in `./fill/18`. Use `width` /
 * `height` (or `size`) to scale at the call site.
 */

import {
  ChevronLeft,
  type LucideIcon,
  type LucideProps,
  Star,
} from "lucide-react";

function filled(Icon: LucideIcon, displayName: string) {
  function Filled(props: LucideProps) {
    return <Icon fill="currentColor" {...props} />;
  }
  Filled.displayName = displayName;
  return Filled;
}

export const IconStarFill12 = filled(Star, "IconStarFill12");
export const IconChevronLeftFill12 = filled(
  ChevronLeft,
  "IconChevronLeftFill12",
);
