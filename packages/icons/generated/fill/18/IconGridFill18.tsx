/** Hand-authored layout glyph (Nucleo slot aliased to Cols). */
import { createIcon } from "../../../lib/create-icon";

const inner = ({ strokeWidth = 1.5 }) => (
  <>
    <rect
      x="2"
      y="2"
      width="6"
      height="6"
      rx="1.75"
      ry="1.75"
      fill="currentColor"
      strokeWidth="0"
    />
    <rect
      x="10"
      y="2"
      width="6"
      height="6"
      rx="1.75"
      ry="1.75"
      fill="currentColor"
      strokeWidth="0"
      data-color="color-2"
    />
    <rect
      x="2"
      y="10"
      width="6"
      height="6"
      rx="1.75"
      ry="1.75"
      fill="currentColor"
      strokeWidth="0"
      data-color="color-2"
    />
    <rect
      x="10"
      y="10"
      width="6"
      height="6"
      rx="1.75"
      ry="1.75"
      fill="currentColor"
      strokeWidth="0"
    />
  </>
);

export const IconGridFill18 = createIcon(inner, { size: 18 });
