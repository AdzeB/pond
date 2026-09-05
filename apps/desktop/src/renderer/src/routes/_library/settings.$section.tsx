import {
  createFileRoute,
  redirect,
  useRouterState,
} from "@tanstack/react-router";
import { SettingsDetail } from "@/features/settings/components/detail/detail";
import {
  rememberSettingsSection,
  resolveSettingsSection,
} from "@/features/settings/lib/open-settings";

export const Route = createFileRoute("/_library/settings/$section")({
  beforeLoad: ({ params, location }) => {
    const resolved = resolveSettingsSection(params.section);
    rememberSettingsSection(resolved);
    if (resolved === params.section) return;
    const hash = location.hash ? `#${location.hash.replace(/^#/, "")}` : "";
    throw redirect({ href: `/settings/${resolved}${hash}` });
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
