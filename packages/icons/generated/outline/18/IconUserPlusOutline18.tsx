import { createIcon } from "../../../lib/create-icon";

const inner = ({ strokeWidth = 1.5 }) => (
  <g
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={strokeWidth}
  >
    <circle cx="9" cy="4.5" r="2.75" />
    <path d="M12.25 10.66A6.22 6.22 0 0 0 9 9.75c-2.55 0-4.739 1.53-5.709 3.721-.365.825.087 1.774.947 2.045 1.225.386 2.846.734 4.762.734h.75" />
    <path d="M14.75 12.25v5m-2.5-2.5h5" />
  </g>
);

export const IconUserPlusOutline18 = createIcon(inner, {
  strokeWidth: 1.5,
  size: 18,
});
