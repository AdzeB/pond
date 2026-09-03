import log from "electron-log/main.js";
import type { PipelineSnapshot } from "./reconciler";

type Reconciler = typeof import("./reconciler");

let reconcilerPromise: Promise<Reconciler> | null = null;

function loadReconciler(): Promise<Reconciler> {
  reconcilerPromise ??= import("./reconciler");
  return reconcilerPromise;
}

function reportLoadFailure(error: unknown): void {
  log.error("[pipeline] failed to load reconciler", error);
}

export function startReconciler(): void {
  void loadReconciler()
    .then((reconciler) => reconciler.startReconciler())
    .catch(reportLoadFailure);
}

export function kickReconciler(): void {
  void loadReconciler()
    .then((reconciler) => reconciler.kickReconciler())
    .catch(reportLoadFailure);
}

export async function setReconcilerPaused(paused: boolean): Promise<boolean> {
  const reconciler = await loadReconciler();
  if (paused) reconciler.pauseReconciler();
  else reconciler.resumeReconciler();
  return reconciler.isReconcilerPaused();
}

export async function cancelSaveIngest(saveId: string): Promise<boolean> {
  return (await loadReconciler()).cancelSaveIngest(saveId);
}

export async function cancelAllIngest(): Promise<number> {
  return (await loadReconciler()).cancelAllIngest();
}

export async function pipelineSnapshot(): Promise<PipelineSnapshot> {
  return (await loadReconciler()).pipelineSnapshot();
}
