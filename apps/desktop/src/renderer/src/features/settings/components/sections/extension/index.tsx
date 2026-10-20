import {
  EXTENSION_LIKE_SOURCES,
  sourceFlag,
} from "@pond/schema/browser-extension";
import {
  EXTERNAL_SOURCE_IDS,
  type ExternalSource,
  sourceLabel,
} from "@pond/schema/sources";
import { Settings, Switch } from "@pond/ui";
import { Fragment } from "react";
import { usePrefs } from "@/shared/state/prefs";

const SAVES = {
  twitter: "Save posts when you bookmark them.",
  instagram: "Save posts when you save them to a collection.",
  pinterest: "Save Pins when you save them to a board.",
  arena: "Save blocks when you connect them to a channel.",
  cosmos: "Save elements when you save them to a cluster.",
  tiktok: "Save videos when you add them to Favorites.",
  youtube: "Save videos when you add them to a playlist.",
  reddit: "Save posts when you save them.",
  threads: "Save posts when you save them.",
} satisfies Record<ExternalSource, string>;

const LIKE_SOURCES: ReadonlySet<ExternalSource> = new Set(
  EXTENSION_LIKE_SOURCES,
);

export function ExtensionSources() {
  const [extension, patch, loaded] = usePrefs("extension");

  return (
    <Settings.List>
      {EXTERNAL_SOURCE_IDS.map((source) => {
        const label = sourceLabel(source);
        const on = sourceFlag(extension.enabled, source);
        const upvotes = source === "reddit";
        return (
          <Fragment key={source}>
            <Settings.Item>
              <Settings.ItemDetails>
                <Settings.ItemTitle>{label}</Settings.ItemTitle>
                <Settings.ItemDescription>
                  {SAVES[source]}
                </Settings.ItemDescription>
              </Settings.ItemDetails>
              <Settings.ItemControl>
                <Switch.Root
                  aria-label={label}
                  checked={on}
                  disabled={!loaded}
                  onCheckedChange={(next) =>
                    void patch({
                      enabled: { ...extension.enabled, [source]: next },
                    })
                  }
                />
              </Settings.ItemControl>
            </Settings.Item>
            {LIKE_SOURCES.has(source) ? (
              <Settings.Item disabled={!on}>
                <Settings.ItemDetails>
                  <Settings.ItemTitle>
                    {upvotes ? "Include Upvotes" : "Include Likes"}
                  </Settings.ItemTitle>
                  <Settings.ItemDescription>
                    {upvotes
                      ? "Also save posts you upvote."
                      : "Also save what you like."}
                  </Settings.ItemDescription>
                </Settings.ItemDetails>
                <Settings.ItemControl>
                  <Switch.Root
                    aria-label={`${label} ${upvotes ? "Upvotes" : "Likes"}`}
                    checked={sourceFlag(extension.likes, source)}
                    disabled={!loaded || !on}
                    onCheckedChange={(next) =>
                      void patch({
                        likes: { ...extension.likes, [source]: next },
                      })
                    }
                  />
                </Settings.ItemControl>
              </Settings.Item>
            ) : null}
          </Fragment>
        );
      })}
    </Settings.List>
  );
}
