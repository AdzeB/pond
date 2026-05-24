/**
 * 18px filled icons. Wrap Lucide outline icons with `fill="currentColor"`
 * to get a solid silhouette that still respects the Pond colour token
 * applied via CSS `color`.
 *
 * Closed paths (Star, Bookmark, Pin, etc.) fill cleanly. Open shapes
 * like a chevron stay visually identical to their outline twin since
 * Lucide ships them as polylines, which is fine for the few places we
 * use a "fill" chevron.
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

export const IconStarFill18 = filled(Star, "IconStarFill18");
export const IconChevronLeftFill18 = filled(
  ChevronLeft,
  "IconChevronLeftFill18",
);
