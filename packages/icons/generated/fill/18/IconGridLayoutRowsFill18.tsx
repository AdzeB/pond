/** Hand-authored layout glyph (Nucleo slot aliased to Cols). */
import { createIcon } from "../../../lib/create-icon";

const inner = () => (
  <>
    <rect
      x="2"
      y="2"
      width="14"
      height="6"
      rx="2.25"
      ry="2.25"
      fill="currentColor"
      strokeWidth="0"
      data-color="color-2"
    />
    <rect
      x="2"
      y="10"
      width="14"
      height="6"
      rx="2.25"
      ry="2.25"
      strokeWidth="0"
      fill="currentColor"
    />
  </>
);

export const IconGridLayoutRowsFill18 = createIcon(inner, { size: 18 });
