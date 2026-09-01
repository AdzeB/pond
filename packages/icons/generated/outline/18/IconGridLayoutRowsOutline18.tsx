/** Hand-authored layout glyph (Nucleo slot aliased to Cols). */
import { createIcon } from "../../../lib/create-icon";

const inner = ({ strokeWidth = 1.5 }) => (
  <>
    <rect
      x="2.75"
      y="2.75"
      width="12.5"
      height="4.5"
      rx="1.5"
      ry="1.5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
    ></rect>
    <rect
      x="2.75"
      y="10.75"
      width="12.5"
      height="4.5"
      rx="1.5"
      ry="1.5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      data-color="color-2"
    ></rect>
  </>
);

export const IconGridLayoutRowsOutline18 = createIcon(inner, {
  strokeWidth: 1.5,
  size: 18,
});
