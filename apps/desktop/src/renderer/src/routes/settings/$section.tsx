import { SETTINGS_SECTION_ALIASES, SETTINGS_SECTIONS } from "@pond/schema";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Suspense } from "react";
import { SettingsSectionView } from "@/features/settings/engine";
import { SECTIONS } from "@/features/settings/registry";

// Path validation uses the lightweight schema list so redirects don't pull in the registry chunk; only the component below does.
const VALID_PATHS = new Set(SETTINGS_SECTIONS.map((section) => section.path));
const DEFAULT_PATH = SETTINGS_SECTIONS[0]?.path ?? "general";

function resolveSectionPath(path: string): string {
  return SETTINGS_SECTION_ALIASES[path] ?? path;
}

const CONFIG_BY_PATH = new Map(
  SECTIONS.map((section) => [section.path, section.config]),
);

function SectionRoute() {
  const { section } = Route.useParams();
  const config = CONFIG_BY_PATH.get(section);
  if (!config) return null;
  return (
    <Suspense fallback={null}>
      <SettingsSectionView config={config} />
    </Suspense>
  );
}

export const Route = createFileRoute("/settings/$section")({
  beforeLoad: ({ params }) => {
    const section = resolveSectionPath(params.section);
    if (section !== params.section) {
      throw redirect({
        to: "/settings/$section",
        params: { section },
        replace: true,
      });
    }
    if (!VALID_PATHS.has(section)) {
      throw redirect({
        to: "/settings/$section",
        params: { section: DEFAULT_PATH },
        replace: true,
      });
    }
  },
  component: SectionRoute,
});
