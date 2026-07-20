import { useCallback, useEffect, useRef, useState } from "react";

/** Self-contained toast queue for the playground, independent of the real Base UI manager, so each variant can interpret the same feed with its own stacking and dismissal rules. */

export type Tone = "info" | "success" | "error";

export interface PlaygroundToast {
  id: number;
  message: string;
  tone: Tone;
  actionLabel?: string;
  /** 0..1 while a long-running job is underway; absent on instant toasts. */
  progress?: number;
  done?: boolean;
}

export interface PushOptions {
  message: string;
  tone?: Tone;
  actionLabel?: string;
  /** Marks a long-running job: progress animates over `ms`, then the toast flips to `doneMessage`. */
  job?: { ms: number; doneMessage: string };
  ms?: number;
}

export interface ToastEngine {
  toasts: readonly PlaygroundToast[];
  push: (options: PushOptions) => void;
  dismiss: (id: number) => void;
  clear: () => void;
}

export interface VariantProps {
  toasts: readonly PlaygroundToast[];
  dismiss: (id: number) => void;
  /** Slow-motion factor from the rail; variants multiply their durations by it. */
  timeScale: number;
}

const DEFAULT_MS = 4000;
const ERROR_MS = 6000;
const DONE_HOLD_MS = 2200;
const TICK_MS = 80;

function clearHandles(handles: number[]): void {
  for (const handle of handles) {
    window.clearTimeout(handle);
    window.clearInterval(handle);
  }
}

export function useToastEngine(timeScale: number): ToastEngine {
  const [toasts, setToasts] = useState<PlaygroundToast[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, number[]>());
  const scale = useRef(timeScale);
  scale.current = timeScale;

  const dismiss = useCallback((id: number) => {
    const handles = timers.current.get(id);
    if (handles) clearHandles(handles);
    timers.current.delete(id);
    setToasts((list) => list.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (options: PushOptions) => {
      const id = nextId.current++;
      const tone = options.tone ?? "info";
      const handles: number[] = [];
      timers.current.set(id, handles);

      if (options.job) {
        const { ms, doneMessage } = options.job;
        const total = ms * scale.current;
        const started = performance.now();
        const tick = window.setInterval(() => {
          const progress = Math.min(1, (performance.now() - started) / total);
          if (progress < 1) {
            setToasts((list) =>
              list.map((t) => (t.id === id ? { ...t, progress } : t)),
            );
            return;
          }
          window.clearInterval(tick);
          setToasts((list) =>
            list.map((t) =>
              t.id === id
                ? {
                    ...t,
                    progress: 1,
                    done: true,
                    tone: "success",
                    message: doneMessage,
                  }
                : t,
            ),
          );
          handles.push(
            window.setTimeout(() => dismiss(id), DONE_HOLD_MS * scale.current),
          );
        }, TICK_MS);
        handles.push(tick);
        setToasts((list) => [
          ...list,
          { id, message: options.message, tone, progress: 0 },
        ]);
        return;
      }

      const ms = options.ms ?? (tone === "error" ? ERROR_MS : DEFAULT_MS);
      handles.push(window.setTimeout(() => dismiss(id), ms * scale.current));
      setToasts((list) => [
        ...list,
        {
          id,
          message: options.message,
          tone,
          actionLabel: options.actionLabel,
        },
      ]);
    },
    [dismiss],
  );

  const clear = useCallback(() => {
    for (const handles of timers.current.values()) clearHandles(handles);
    timers.current.clear();
    setToasts([]);
  }, []);

  useEffect(
    () => () => {
      for (const handles of timers.current.values()) clearHandles(handles);
      timers.current.clear();
    },
    [],
  );

  return { toasts, push, dismiss, clear };
}
