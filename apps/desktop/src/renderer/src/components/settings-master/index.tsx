import { IconChevronRightOutline18 as ChevronRight } from "@pond/icons/outline/18";
import { Shell, TitleBar } from "@pond/ui";
import { Link } from "@tanstack/react-router";
import { usePonds } from "@/hooks/use-ponds";
import { SETTINGS_MASTER_GROUPS } from "@/lib/settings/registry";
import { glyphKind, PondGlyph } from "@/lib/ui/pond-icons";
import { pondCustomise } from "@/stores/pond-customise";
import styles from "./styles.module.css";

export function SettingsMaster() {
  const { active } = usePonds();
  const edit = () => pondCustomise.open(active?.path);

  return (
    <>
      <Shell.Mask />
      <Shell.Header>
        <TitleBar.Root>
          <TitleBar.Title>
            <TitleBar.Label>Settings</TitleBar.Label>
          </TitleBar.Title>
        </TitleBar.Root>
      </Shell.Header>

      <div className={styles.body}>
        <button type="button" className={styles.account} onClick={edit}>
          <span
            aria-hidden
            className={styles.avatar}
            data-emoji={
              active && glyphKind(active.avatar) === "emoji" ? true : undefined
            }
            data-icon={
              active && glyphKind(active.avatar) === "icon" ? true : undefined
            }
            style={active?.color ? { background: active.color } : undefined}
          >
            {active ? (
              <PondGlyph
                avatar={active.avatar}
                name={active.name}
                iconSize={26}
              />
            ) : (
              ""
            )}
          </span>
          <span className={styles.accountText}>
            <span className={styles.accountName}>
              {active?.name ?? "Library"}
            </span>
            <span className={styles.accountSub}>Manage your Pond</span>
          </span>
          <ChevronRight
            className={styles.chev}
            strokeWidth={2.5}
            width={12}
            height={12}
          />
        </button>

        {SETTINGS_MASTER_GROUPS.map((group) => (
          <section className={styles.group} key={group.group}>
            <h2 className={styles.glabel}>{group.label}</h2>
            <div className={styles.card}>
              {group.sections.map((section) => (
                <Link
                  key={section.id}
                  to="/settings/$section"
                  params={{ section: section.path }}
                  className={styles.row}
                >
                  <span className={styles.rico}>
                    <section.icon width={17} height={17} />
                  </span>
                  <span className={styles.rlabel}>{section.label}</span>
                  <ChevronRight
                    className={styles.chev}
                    strokeWidth={2.5}
                    width={12}
                    height={12}
                  />
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
