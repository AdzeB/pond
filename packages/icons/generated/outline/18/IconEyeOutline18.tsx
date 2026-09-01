import { createIcon } from "../../../lib/create-icon";

const inner = ({ strokeWidth = 1.5 }) => (
  <g
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={strokeWidth}
  >
    <path d="M15.956 7.887C14.98 6.165 12.794 3.75 9 3.75S3.02 6.165 2.044 7.887a2.25 2.25 0 0 0 0 2.226C3.02 11.835 5.206 14.25 9 14.25s5.98-2.415 6.956-4.137a2.25 2.25 0 0 0 0-2.226Z" />
    <circle cx="9" cy="9" r="2.75" />
  </g>
);

export const IconEyeOutline18 = createIcon(inner, {
  strokeWidth: 1.5,
  size: 18,
});
