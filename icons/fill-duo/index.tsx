/**
 * "Fill duo" icons. The Nucleo set this replaces had a primary stroke
 * and a secondary tinted fill exposed via `data-color="color-2"`.
 * Lucide doesn't ship a duotone family, so we approximate by filling
 * the closed regions of an outline icon with `currentColor` at a
 * reduced opacity. Consumers that want a different secondary tint can
 * still pass a custom `fill` / `fillOpacity` via props.
 */

import {
  type LucideIcon,
  type LucideProps,
  Network,
  SlidersHorizontal,
} from "lucide-react";

function duo(Icon: LucideIcon, displayName: string) {
  function Duo(props: LucideProps) {
    return <Icon fill="currentColor" fillOpacity={0.2} {...props} />;
  }
  Duo.displayName = displayName;
  return Duo;
}

export const IconConnectedDotsFillDuo18 = duo(
  Network,
  "IconConnectedDotsFillDuo18",
);
export const IconSliderFillDuo18 = duo(
  SlidersHorizontal,
  "IconSliderFillDuo18",
);
