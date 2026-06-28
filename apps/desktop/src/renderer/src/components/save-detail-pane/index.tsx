import {
  IconPalette2Outline18 as ColorsIcon,
  IconDropCapOutline18 as ContentIcon,
  IconCircleQuestionOutline18 as Help,
  IconChartActivity2Outline18 as InsightsIcon,
  IconOrderedList2Outline18 as PropertiesIcon,
} from "@pond/icons/outline/18";
import { Button, TitleBar, Tooltip } from "@pond/ui";
import { ColorSwatch } from "@/components/color-swatch";
import { ExpandableText } from "@/components/expandable-text";
import { Insight } from "@/components/save-detail-insight";
import { Section } from "@/components/save-detail-section";
import { TagsSection } from "@/components/save-detail-tags";
import { KebabMenu } from "@/components/save-inspector-kebab";
import { pickAuthorColor } from "@/components/save-preview/helpers";
import { useSaveDetail } from "@/hooks/use-save-detail";
import { initials } from "@/lib/initials";
import type { Save } from "@/lib/types";
import { pushToast } from "@/stores/toasts";
import styles from "./styles.module.css";

export function SaveDetails({ save }: { save: Save }) {
  const {
    engagement,
    rows,
    description,
    caption,
    ocr,
    transcript,
    style,
    colors,
    avatarUrl,
    sourceIcon: SourceIcon,
    hasInsights,
  } = useSaveDetail(save.id);

  const copyRawJson = async () => {
    try {
      const json = JSON.stringify(save.rawJson ?? {}, null, 2);
      await navigator.clipboard.writeText(json);
      pushToast("Copied raw JSON", "success");
    } catch {
      pushToast("Could not copy", "error");
    }
  };

  return (
    <div className={styles.detailCard}>
      <TitleBar.Root className={styles.detailHeader}>
        <TitleBar.Start>
          <KebabMenu save={save} />
        </TitleBar.Start>
        <TitleBar.Title>
          <TitleBar.Label>Save Details</TitleBar.Label>
        </TitleBar.Title>
        <TitleBar.End>
          <Tooltip label="Help" side="top">
            <Button icon size="sm" variant="ghost" aria-label="Help">
              <Help />
            </Button>
          </Tooltip>
        </TitleBar.End>
      </TitleBar.Root>

      <div className={styles.detailScroll}>
        {description ? (
          <Section
            icon={<ContentIcon width={16} height={16} />}
            title="Content"
          >
            <ExpandableText text={description} compact />
          </Section>
        ) : null}

        <Section
          icon={<PropertiesIcon width={16} height={16} />}
          title="Properties"
        >
          {engagement.length > 0 ? (
            <div className={styles.metrics}>
              {engagement.map((m) => (
                <div key={m.id} className={styles.metric}>
                  <span className={styles.metricLabel}>{m.label}</span>
                  <span className={styles.metricValue}>{m.value}</span>
                </div>
              ))}
            </div>
          ) : null}
          <div className={styles.rows}>
            {rows.map((row, i) => (
              <div
                key={row.id}
                className={styles.row}
                data-alt={i % 2 === 1 ? "true" : undefined}
              >
                <span className={styles.rowLabel}>{row.label}</span>
                {row.kind === "author" ? (
                  <span className={styles.rowInline}>
                    <span
                      className={styles.rowAvatar}
                      style={{ background: pickAuthorColor(row.value) }}
                      aria-hidden
                    >
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          draggable={false}
                        />
                      ) : (
                        initials(row.value)
                      )}
                    </span>
                    <span className={styles.rowValue}>{row.value}</span>
                  </span>
                ) : row.kind === "platform" ? (
                  <span className={styles.rowInline}>
                    {SourceIcon ? (
                      <span className={styles.rowSourceIcon} aria-hidden>
                        <SourceIcon width={16} height={16} />
                      </span>
                    ) : null}
                    <span className={styles.rowValue}>{row.value}</span>
                  </span>
                ) : (
                  <span className={styles.rowValue} title={row.value}>
                    {row.value}
                  </span>
                )}
              </div>
            ))}
          </div>
        </Section>

        <TagsSection save={save} />

        {colors.length > 0 ? (
          <Section
            icon={<ColorsIcon width={16} height={16} />}
            title="Colors"
            tight
          >
            <div className={styles.colors}>
              {colors.map((color) => (
                <ColorSwatch key={color} color={color} />
              ))}
            </div>
          </Section>
        ) : null}

        {hasInsights ? (
          <Section
            icon={<InsightsIcon width={18} height={18} />}
            title="Insights"
            tight
          >
            <div className={styles.insights}>
              {caption ? (
                <Insight label="Caption" copyText={caption}>
                  <p className={styles.insightText}>{caption}</p>
                </Insight>
              ) : null}
              {ocr ? (
                <Insight label="Extracted Text" copyText={ocr}>
                  <p className={styles.insightText}>{ocr}</p>
                </Insight>
              ) : null}
              {transcript ? (
                <Insight label="Transcript" copyText={transcript}>
                  <ExpandableText text={transcript} />
                </Insight>
              ) : null}
              {style.length > 0 ? (
                <Insight label="Style">
                  <div className={styles.tags}>
                    {style.map((item) => (
                      <span key={item} className={styles.chip}>
                        {item}
                      </span>
                    ))}
                  </div>
                </Insight>
              ) : null}
            </div>
          </Section>
        ) : null}
      </div>

      <footer className={styles.detailFooter}>
        <button
          type="button"
          className={styles.footerSecondary}
          onClick={() => void copyRawJson()}
        >
          Copy Raw JSON
        </button>
      </footer>
    </div>
  );
}
