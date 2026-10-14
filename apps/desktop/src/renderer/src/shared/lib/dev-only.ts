import { redirect } from "@tanstack/react-router";

export function requireDevBuild(): void {
  if (!import.meta.env.DEV) throw redirect({ to: "/" });
}
