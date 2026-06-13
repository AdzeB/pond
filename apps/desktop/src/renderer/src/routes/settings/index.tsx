import { SETTINGS_SECTIONS } from "@pond/schema";
import { createFileRoute, redirect } from "@tanstack/react-router";

// Schema-only so this redirect doesn't pull in the settings registry chunk
// (see the note in `$section.tsx`).
const DEFAULT_PATH = SETTINGS_SECTIONS[0]?.path ?? "general";

export const Route = createFileRoute("/settings/")({
  beforeLoad: () => {
    throw redirect({
      to: "/settings/$section",
      params: { section: DEFAULT_PATH },
      replace: true,
    });
  },
});
