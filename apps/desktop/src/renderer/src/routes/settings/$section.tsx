import { createFileRoute, redirect } from "@tanstack/react-router";
import { Suspense } from "react";
import { SettingsSectionView } from "@/components/settings/engine";
import { DEFAULT_SECTION, SECTIONS } from "@/components/settings/registry";

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
    if (!CONFIG_BY_PATH.has(params.section)) {
      throw redirect({
        to: "/settings/$section",
        params: { section: DEFAULT_SECTION.path },
        replace: true,
      });
    }
  },
  component: SectionRoute,
});
