import { LOGO_PATH, LOGO_VIEW_BOX } from "@pond/ui/logo";
import {
  MARK_CENTER,
  RING_RADIUS,
  RING_THICKNESS,
  ringMorphPath,
} from "@/features/library/components/harvester-button/ring-morph";
import { mix } from "../../stage/timeline";

interface MorphProps extends React.ComponentPropsWithoutRef<"svg"> {
  size: number;
  /** 1 is the mark, 0 is a ring. */
  mark: number;
  /** Once a ring: 0 is the spinning arc, 1 the closed ring. */
  close?: number;
  /** Arc rotation in degrees. */
  turn?: number;
}

/** Pond's mark, morphing into the loader ring the app shows while it saves. */
export function Morph({
  size,
  mark,
  close = 1,
  turn = 0,
  ...props
}: MorphProps) {
  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${LOGO_VIEW_BOX} ${LOGO_VIEW_BOX}`}
      width={size}
      height={size}
      {...props}
    >
      {mark > 0 ? (
        <path
          d={mark >= 1 ? LOGO_PATH : ringMorphPath(mark)}
          fill="currentColor"
          fillRule="evenodd"
        />
      ) : (
        <>
          <circle
            cx={MARK_CENTER}
            cy={MARK_CENTER}
            r={RING_RADIUS}
            stroke="currentColor"
            strokeWidth={RING_THICKNESS}
            fill="none"
            opacity={0.12 * (1 - close)}
          />
          <circle
            cx={MARK_CENTER}
            cy={MARK_CENTER}
            r={RING_RADIUS}
            stroke="currentColor"
            strokeWidth={RING_THICKNESS}
            strokeLinecap="round"
            fill="none"
            pathLength={100}
            strokeDasharray={`${mix(28, 100, close)} 100`}
            transform={`rotate(${turn - 90} ${MARK_CENTER} ${MARK_CENTER})`}
          />
        </>
      )}
    </svg>
  );
}
