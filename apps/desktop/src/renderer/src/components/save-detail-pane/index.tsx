import { IconXmarkOutline18 as Cross } from "@pond/icons/outline/18";
import { Button, TitleBar } from "@pond/ui";
import type { ReactNode } from "react";
import { ColorSwatch } from "@/components/color-swatch";
import { ExpandableText } from "@/components/expandable-text";
import {
  type InsightSpec,
  type InsightState,
  Insights,
} from "@/components/save-detail-insight";
import { Section } from "@/components/save-detail-section";
import { TagsSection } from "@/components/save-detail-tags";
import { KebabMenu } from "@/components/save-inspector-kebab";
import { pickAuthorColor } from "@/components/save-preview/lib/helpers";
import { useSaveDetail } from "@/hooks/use-save-detail";
import { useSaveEnrichment } from "@/hooks/use-save-enrichment";
import type { Save } from "@/lib/types";
import { initials } from "@/lib/util/initials";
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
  } = useSaveDetail(save.id);

  const enrich = useSaveEnrichment(save.id);

  const insights: InsightSpec[] = [];

  const pushSlot = (
    id: string,
    label: string,
    body: { text?: string; content?: ReactNode; hasContent: boolean },
  ): void => {
    const st = enrich.statusOf(id);
    let state: InsightState | null = null;
    if (st.running) state = "running";
    else if (body.hasContent) state = "ready";
    else if (st.failed) state = "failed";
    else if (st.enabled && st.eligible) state = "queued";
    if (!state) return;
    insights.push({
      id,
      label,
      state,
      text: body.text,
      content: body.content,
      onRegenerate:
        state === "ready" && enrich.canRegenerate(id)
          ? () => enrich.regenerate(id)
          : undefined,
      onRetry: state === "failed" ? enrich.retry : undefined,
    });
  };

  pushSlot("caption", "Caption", { text: caption, hasContent: !!caption });

  pushSlot("ocr", "Extracted Text", { text: ocr, hasContent: !!ocr });

  pushSlot("transcript", "Transcript", {
    text: transcript,
    hasContent: !!transcript,
  });

  pushSlot("aesthetic", "Style", {
    hasContent: style.length > 0,
    content:
      style.length > 0 ? (
        <div className={styles.tags}>
          {style.map((item) => (
            <span key={item} className={styles.chip}>
              {item}
            </span>
          ))}
        </div>
      ) : undefined,
  });

  return (
    <div className={styles["detail-card"]}>
      <TitleBar.Root className={styles["detail-header"]}>
        <TitleBar.Start>
          <KebabMenu save={save} />
        </TitleBar.Start>
        <TitleBar.Title>
          <TitleBar.Label>Save Details</TitleBar.Label>
        </TitleBar.Title>
        <TitleBar.End>
          <Button icon size="sm" variant="ghost" aria-label="Close">
            <Cross />
          </Button>
        </TitleBar.End>
      </TitleBar.Root>

      <div className={styles["detail-scroll"]}>
        {description ? (
          <Section title="Content">
            <ExpandableText text={description} compact />
          </Section>
        ) : null}

        <Section title="Properties">
          {engagement.length > 0 ? (
            <div className={styles.metrics}>
              {engagement.map((m) => (
                <div key={m.id} className={styles.metric}>
                  <span className={styles["metric-label"]}>{m.label}</span>
                  <span className={styles["metric-value"]}>{m.value}</span>
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
                <span className={styles["row-label"]}>{row.label}</span>
                {row.kind === "author" ? (
                  <span className={styles["row-inline"]}>
                    <span
                      className={styles["row-avatar"]}
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
                    <span className={styles["row-value"]}>{row.value}</span>
                  </span>
                ) : row.kind === "platform" ? (
                  <span className={styles["row-inline"]}>
                    {SourceIcon ? (
                      <span className={styles["row-source-icon"]} aria-hidden>
                        <SourceIcon width={16} height={16} />
                      </span>
                    ) : null}
                    <span className={styles["row-value"]}>{row.value}</span>
                  </span>
                ) : (
                  <span className={styles["row-value"]} title={row.value}>
                    {row.value}
                  </span>
                )}
              </div>
            ))}
          </div>
        </Section>

        <TagsSection save={save} />

        {colors.length > 0 ? (
          <Section title="Colors">
            <div className={styles.colors}>
              {colors.map((color) => (
                <ColorSwatch key={color} color={color} />
              ))}
            </div>
          </Section>
        ) : null}

        {insights.length > 0 ? (
          <Section title="Insights">
            <Insights insights={insights} />
          </Section>
        ) : null}
      </div>
    </div>
  );
}
