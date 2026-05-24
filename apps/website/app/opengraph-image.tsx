import { ImageResponse } from "next/og";

export const alt = "Pond. A local-first archive for the open web.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "72px",
        background: "#0a0a0a",
        color: "#f5f5f5",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          fontSize: "28px",
          letterSpacing: "-0.01em",
        }}
      >
        <PondMark />
        <span style={{ fontWeight: 600 }}>Pond</span>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "24px",
        }}
      >
        <div
          style={{
            fontSize: "72px",
            lineHeight: 1.05,
            letterSpacing: "-0.025em",
            fontWeight: 500,
            maxWidth: "920px",
          }}
        >
          The web is a sea of information. Everyone deserves their own pond.
        </div>
        <div
          style={{
            fontSize: "26px",
            color: "#a1a1a1",
            letterSpacing: "-0.005em",
            maxWidth: "880px",
          }}
        >
          A local-first archive for everything you save across the open web.
        </div>
      </div>
    </div>,
    size,
  );
}

function PondMark() {
  return (
    <svg width="40" height="40" viewBox="0 0 32 32" fill="none">
      <title>Pond</title>
      <rect width="32" height="32" rx="7" fill="#f5f5f5" />
      <circle
        cx="16"
        cy="16"
        r="6"
        fill="none"
        stroke="#0a0a0a"
        strokeWidth="2"
      />
      <circle
        cx="16"
        cy="16"
        r="10"
        fill="none"
        stroke="#0a0a0a"
        strokeOpacity="0.5"
        strokeWidth="1"
      />
      <circle
        cx="16"
        cy="16"
        r="13.5"
        fill="none"
        stroke="#0a0a0a"
        strokeOpacity="0.25"
        strokeWidth="1"
      />
    </svg>
  );
}
