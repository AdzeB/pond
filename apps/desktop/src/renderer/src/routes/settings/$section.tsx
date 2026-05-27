import { createFileRoute, redirect } from "@tanstack/react-router";
import { type ComponentType, lazy, Suspense } from "react";
import { DEFAULT_SECTION, SECTIONS } from "@/components/settings/registry";

const SECTION_LAZY = new Map<string, ComponentType>(
  SECTIONS.map((section) => [
    section.path,
    lazy(async () => ({
      default: (await section.load()).Component,
    })),
  ]),
);

function SectionRoute() {
  const { section } = Route.useParams();
  const Component = SECTION_LAZY.get(section);
  if (!Component) return null;
  return (
    <Suspense fallback={null}>
      <Component />
    </Suspense>
  );
}

export const Route = createFileRoute("/settings/$section")({
  beforeLoad: ({ params }) => {
    if (!SECTION_LAZY.has(params.section)) {
      throw redirect({
        to: "/settings/$section",
        params: { section: DEFAULT_SECTION.path },
        replace: true,
      });
    }
  },
  component: SectionRoute,
});
