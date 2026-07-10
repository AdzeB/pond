import { SETTINGS_SECTION_ALIASES, SETTINGS_SECTIONS } from "@pond/schema";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { SettingsDetail } from "@/components/settings-detail";
import { loadAppInfo } from "@/lib/app-info";

// Path validation uses the lightweight schema list so redirects don't pull in the registry chunk; only the component below does.
const VALID_PATHS = new Set(SETTINGS_SECTIONS.map((section) => section.path));
const DEFAULT_PATH = SETTINGS_SECTIONS[0]?.path ?? "general";

function resolveSectionPath(path: string): string {
  return SETTINGS_SECTION_ALIASES[path] ?? path;
}

function SectionRoute() {
  const { section } = Route.useParams();
  return <SettingsDetail section={section} />;
}

export const Route = createFileRoute("/settings/$section")({
  beforeLoad: async ({ params }) => {
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
    if (section === "developer") {
      const info = await loadAppInfo();
      if (info.isPackaged) {
        throw redirect({
          to: "/settings/$section",
          params: { section: DEFAULT_PATH },
          replace: true,
        });
      }
    }
  },
  component: SectionRoute,
});
