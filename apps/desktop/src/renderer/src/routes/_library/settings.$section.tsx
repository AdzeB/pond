import {
  createFileRoute,
  redirect,
  useRouterState,
} from "@tanstack/react-router";
import { SettingsDetail } from "@/features/settings/components/detail";
import {
  rememberSettingsSection,
  resolveSettingsLocation,
  settingsHref,
} from "@/shared/lib/open-settings";

export const Route = createFileRoute("/_library/settings/$section")({
  beforeLoad: ({ params, location }) => {
    const currentHash = location.hash?.replace(/^#/, "") || null;
    const resolved = resolveSettingsLocation(params.section, currentHash ?? "");
    rememberSettingsSection(resolved.section);
    if (resolved.section === params.section && resolved.hash === currentHash) {
      return;
    }
    throw redirect({
      href: settingsHref(resolved.section, resolved.hash ?? undefined),
    });
  },
  component: SettingsSectionRoute,
});

function SettingsSectionRoute() {
  const { section } = Route.useParams();
  const hash = useRouterState({
    select: (state) => {
      const value = state.location.hash;
      if (!value) return null;
      return value.replace(/^#/, "") || null;
    },
  });
  return <SettingsDetail section={section} hash={hash} />;
}
