import { SETTINGS_SECTION_ALIASES } from "@pond/schema";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Suspense } from "react";
import { SettingsSectionView } from "@/features/settings/engine";
import { DEFAULT_SECTION, SECTIONS } from "@/features/settings/registry";

const CONFIG_BY_PATH = new Map(
  SECTIONS.map((section) => [section.path, section.config]),
);

function resolveSectionPath(path: string): string {
  return SETTINGS_SECTION_ALIASES[path] ?? path;
}

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
    if (!CONFIG_BY_PATH.has(section)) {
      throw redirect({
        to: "/settings/$section",
        params: { section: DEFAULT_SECTION.path },
        replace: true,
      });
    }
  },
  component: SectionRoute,
});
