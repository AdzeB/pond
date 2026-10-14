import { LOGO_PATH, LOGO_VIEW_BOX } from "@pond/ui/logo";
import { ImageResponse } from "next/og";

export const alt = "Pond";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#ffffff",
      }}
    >
      <svg
        width="160"
        height="160"
        viewBox={`0 0 ${LOGO_VIEW_BOX} ${LOGO_VIEW_BOX}`}
        fill="none"
        aria-hidden
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d={LOGO_PATH}
          fill="#171717"
        />
      </svg>
    </div>,
    size,
  );
}
