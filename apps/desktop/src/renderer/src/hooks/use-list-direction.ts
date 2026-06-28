import { useRef } from "react";
import type { Direction } from "@/lib/motion";

export function useListDirection(index: number): Direction {
  const prevIndexRef = useRef(index);
  const directionRef = useRef<Direction>("forward");
  if (index !== prevIndexRef.current) {
    directionRef.current =
      index > prevIndexRef.current ? "forward" : "backward";
    prevIndexRef.current = index;
  }
  return directionRef.current;
}
