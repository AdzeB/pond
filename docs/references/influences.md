# Influence index

This preserves the original catalog’s product influences and personal credits. It records historical claims of influence, not proof that every page was opened or every suggestion adopted. Original access dates, affected commits, and source versions are unknown. Profile links identify credited people and are not bibliography entries. Citations resolve to the source list; original source URLs remain there.

See the [bibliography](../../references.md) and [inventory](inventory.md).

## References workflow

The reference list and private-input boundary follow [Soto (2018)](../../references.md#soto-2018-personal-communication). The Codex and Cursor capture adapters are informed by [OpenAI (n.d.-b)](../../references.md#openai-codex-hooks) and [Cursor (n.d.-a)](../../references.md#cursor-hooks). These sources inform the references standard and capture scripts; they do not establish complete capture.

The hook-health diagnostics use the app-server API described by [OpenAI (n.d.-a)](../../references.md#openai-app-server). Planning consulted [Figma (n.d.-a)](../../references.md#figma-activity-logs) and [Figma (n.d.-b)](../../references.md#figma-version-history-types) to determine which activity and version identifiers to record when exposed by tools; no independent Figma monitor was added.

## Repository engineering

The task graph follows guidance from [Turborepo (n.d.-a)](../../references.md#turborepo-configuring-tasks), [Turborepo (n.d.-c)](../../references.md#turborepo-package-configurations), and [Turborepo (n.d.-d)](../../references.md#turborepo-package-task-graphs). GitHub Actions uses the OIDC flow from [Turborepo (n.d.-b)](../../references.md#turborepo-github-actions) through the short-lived credential action from [Vercel (n.d.-l)](../../references.md#github-vercel-setup-turborepo-remote-cache). Vercel documents external CI authentication ([Vercel, n.d.-k](../../references.md#vercel-external-remote-cache)) and free fair-use availability ([Vercel, 2024](../../references.md#vercel-free-remote-cache)).

The Node 24 and dependency migration consulted Electron's breaking changes
([Electron, n.d.-a](../../references.md#electronjs-org-docs-latest-breaking-changes)),
TanStack Table's React v9 migration
([TanStack, n.d.-a](../../references.md#tanstack-com-table-v9-react-migrating)),
Vitest 5 migration guidance
([Vitest, n.d.-a](../../references.md#vitest-dev-guide-migration)), WXT's
upgrade guide
([WXT, n.d.-a](../../references.md#wxt-dev-guide-resources-upgrading)),
Motion's React upgrade guide
([Motion, n.d.-b](../../references.md#motion-dev-docs-react-upgrade-guide)), and
Commander 15's ESM and Node requirements
([Commander.js, 2026](../../references.md#github-com-tj-commander-js-releases-v15-0-0)).
These sources informed runtime baselines, peer-compatible pins, and framework
migration checks across the desktop, extension, UI, and CLI packages.

## Agent model controls

The AI SDK reasoning guide and OpenAI provider reference
([Vercel, n.d.-m](../../references.md#ai-sdk-reasoning);
[Vercel, n.d.-n](../../references.md#ai-sdk-openai-provider)) informed Pond's
portable Reasoning values and OpenAI Fast request option. Anthropic's premium
Fast mode ([Anthropic, n.d.-d](../../references.md#anthropic-fast-mode)) and
Google's premium Priority PayGo semantics
([Google, n.d.-d](../../references.md#google-priority-paygo)) informed the
native-tier mappings and unavailable states. Pond enables Fast only when the
catalog also declares model support.

## Eagle parity baselines

Eagle's first-party support pages define compatibility baselines and future
acceptance criteria. A citation in this section records the documented behavior;
it does not claim that Pond implements it.

Library transfer and collection planning use Eagle's cross-Library copy and
Eaglepack behavior
([Eagle, n.d.-b](../../references.md#en-eagle-cool-support-article-adding-files-to-other-libraries);
[Eagle, n.d.-av](../../references.md#en-eagle-cool-support-article-import-exporting-eaglepacks)),
collection metadata
([Eagle, n.d.-r](../../references.md#en-eagle-cool-support-article-collect-window)),
font and audio workspaces
([Eagle, n.d.-be](../../references.md#en-eagle-cool-support-article-saving-fonts);
[Eagle, n.d.-z](../../references.md#en-eagle-cool-support-article-disable-automatically-add-style-tags);
[Eagle, n.d.-bd](../../references.md#en-eagle-cool-support-article-save-audio-files)),
and desktop screenshot behavior
([Eagle, n.d.-p](../../references.md#en-eagle-cool-support-article-capturing-screenshots);
[Eagle, n.d.-d](../../references.md#en-eagle-cool-support-article-adjust-default-screenshot-format-and-quality);
[Eagle, n.d.-v](../../references.md#en-eagle-cool-support-article-customize-eagle-screenshot-shortcut);
[Eagle, n.d.-ah](../../references.md#en-eagle-cool-support-article-enable-ask-where-to-save-when-saving-a-screenshot);
[Eagle, n.d.-ag](../../references.md#en-eagle-cool-support-article-enable-also-copy-the-screenshot-to-clipboard)).
These pages determine which metadata, controls, and platform flows parity work
must preserve.

Eaglepack archive layout and synthetic compatibility cases use
[Kerekes (2026)](../../references.md#kerekes-2026-eaglepack-importer) as
reverse-engineered format evidence. Pond's parser is an independent
implementation and does not copy the MIT-licensed importer code.

Organization planning uses Eagle's tag picker and batch operations
([Eagle, n.d.-bi](../../references.md#en-eagle-cool-support-article-tags);
[Eagle, n.d.-l](../../references.md#en-eagle-cool-support-article-batch-create-tags);
[Eagle, n.d.-n](../../references.md#en-eagle-cool-support-article-batch-renaming-folders-smart-folders);
[Eagle, n.d.-m](../../references.md#en-eagle-cool-support-article-batch-rename)),
Actions and shortcuts
([Eagle, n.d.-a](../../references.md#en-eagle-cool-support-article-action);
[Eagle, n.d.-u](../../references.md#en-eagle-cool-support-article-create-tag-shortcut)),
duplicate review
([Eagle, n.d.-an](../../references.md#en-eagle-cool-support-article-finding-similar-duplicate-images)),
image composition
([Eagle, n.d.-s](../../references.md#en-eagle-cool-support-article-combine-images)),
and extension editing
([Eagle, n.d.-af](../../references.md#en-eagle-cool-support-article-edit-file-extensions)).
Subfolder browsing uses the documented parent-folder covers and descendant
visibility behavior
([Eagle, n.d.-aq](../../references.md#en-eagle-cool-support-article-how-to-display-subfolder-covers-in-parent-folders);
[Eagle, n.d.-bh](../../references.md#en-eagle-cool-support-article-show-subfolder-contents)).

Security architecture uses the folder lock, application lock, and Touch ID
descriptions
([Eagle, n.d.-bg](../../references.md#en-eagle-cool-support-article-set-folder-passwords);
[Eagle, n.d.-ay](../../references.md#en-eagle-cool-support-article-password-lock);
[Eagle, n.d.-al](../../references.md#en-eagle-cool-support-article-enable-touch-id-for-quick-unlock-of-application-lock-and-folder-passwords)).
They define interaction parity only. Pond's planned encryption scope and
generated Recovery Key go beyond the guarantees stated by those pages.

Search planning uses keyword scopes and recent searches
([Eagle, n.d.-bf](../../references.md#en-eagle-cool-support-article-search-by-keywords))
and activated-font filtering
([Eagle, n.d.-aj](../../references.md#en-eagle-cool-support-article-finding-activated-fonts)).
Browse planning uses presentation and detached-window behavior
([Eagle, n.d.-az](../../references.md#en-eagle-cool-support-article-presentation-mode);
[Eagle, n.d.-aw](../../references.md#en-eagle-cool-support-article-open-in-new-window)),
random browsing
([Eagle, n.d.-bb](../../references.md#en-eagle-cool-support-article-random-mode)),
video controls
([Eagle, n.d.-bj](../../references.md#en-eagle-cool-support-article-video-player);
[Eagle, n.d.-i](../../references.md#en-eagle-cool-support-article-adjust-mouse-wheel-vertical-scrolling-behavior)),
original-file transforms
([Eagle, n.d.-bc](../../references.md#en-eagle-cool-support-article-rotate-image);
[Eagle, n.d.-ao](../../references.md#en-eagle-cool-support-article-horizontal-flip-image)),
GIF playback
([Eagle, n.d.-ai](../../references.md#en-eagle-cool-support-article-enable-autoplay-gifs-high-cpu-usage)),
default image sizing
([Eagle, n.d.-c](../../references.md#en-eagle-cool-support-article-adjust-default-image-size)),
and thumbnail quality
([Eagle, n.d.-bk](../../references.md#en-eagle-cool-support-article-thumbnail-performance-quality-settings)).
These pages informed the planned reversals recorded in the desktop architecture
without changing current runtime behavior.

Import and export planning uses Eagle's conversion matrix, existing-image
compression, and object links
([Eagle, n.d.-am](../../references.md#en-eagle-cool-support-article-export-images-with-specified-size-or-format);
[Eagle, n.d.-au](../../references.md#en-eagle-cool-support-article-image-compression-without-loss);
[Eagle, n.d.-t](../../references.md#en-eagle-cool-support-article-copy-link)).
Preference planning uses Quick Access, language, interface zoom, sidebar, input,
sound, notification, and duplicate-import behavior
([Eagle, n.d.-ba](../../references.md#en-eagle-cool-support-article-quick-access);
[Eagle, n.d.-q](../../references.md#en-eagle-cool-support-article-change-interface-display-language);
[Eagle, n.d.-f](../../references.md#en-eagle-cool-support-article-adjust-interface-zoom-level);
[Eagle, n.d.-j](../../references.md#en-eagle-cool-support-article-adjust-sidebar-double-click-default-behavior);
[Eagle, n.d.-ap](../../references.md#en-eagle-cool-support-article-hide-sidebar-display-counts);
[Eagle, n.d.-e](../../references.md#en-eagle-cool-support-article-adjust-files-displayed-in-sidebar);
[Eagle, n.d.-g](../../references.md#en-eagle-cool-support-article-adjust-item-double-click);
[Eagle, n.d.-h](../../references.md#en-eagle-cool-support-article-adjust-mouse-wheel-button-behavior);
[Eagle, n.d.-k](../../references.md#en-eagle-cool-support-article-adjust-spacebar-default-behavior);
[Eagle, n.d.-aa](../../references.md#en-eagle-cool-support-article-disable-mouse-hover-zoom);
[Eagle, n.d.-ak](../../references.md#en-eagle-cool-support-article-enable-sound-effects);
[Eagle, n.d.-ac](../../references.md#en-eagle-cool-support-article-disable-notification-on-browser-extension-collection-completion);
[Eagle, n.d.-ab](../../references.md#en-eagle-cool-support-article-disable-notification-on-auto-import);
[Eagle, n.d.-ad](../../references.md#en-eagle-cool-support-article-disable-notify-me-when-importing-duplicates)).
The language page records research provenance only; this foundation change does
not add localization.

Plugin planning uses Eagle's install, uninstall, and shortcut pages
([Eagle, n.d.-ar](../../references.md#en-eagle-cool-support-article-how-to-install-plugins);
[Eagle, n.d.-at](../../references.md#en-eagle-cool-support-article-how-to-uninstall-plugins);
[Eagle, n.d.-as](../../references.md#en-eagle-cool-support-article-how-to-set-up-plugin-shortcuts)).
Pond retains its local API, MCP, CLI, Raycast, and browser-extension surfaces
instead of treating these citations as a commitment to a plugin marketplace.

## On-device enrichment

Sensitive-content enrichment uses Marqo’s binary image classifier and pinned
ONNX artifact ([Marqo, 2025b](../../references.md#marqo-nsfw-image-detection-384);
[Marqo, 2025a](../../references.md#marqo-nsfw-image-detection-384-onnx)).
The model card informed the 384-pixel center crop, label order, warning that
classification is contextual, and configurable confidence bands. Pond stores
the score as derived metadata rather than treating it as content severity.

ONNX Runtime’s WebGPU and session guidance
([ONNX Runtime, n.d.-a](../../references.md#onnxruntime-env-flags-session-options);
[ONNX Runtime, n.d.-b](../../references.md#onnxruntime-webgpu)) informed the
memoized worker session, WebGPU-first provider order, threaded WASM fallback,
and explicit tensor disposal. Images and sampled video frames remain on-device.

The September 2026 [on-device model review](on-device-model-defaults.md) used
the exact Transformers.js 4.3.0 package behavior
([Hugging Face, 2026](../../references.md#huggingface-transformers-4-3-0)),
official model cards for EmbeddingGemma, SigLIP 2, Florence-2, CLIP, BGE, and
Whisper ([Google DeepMind, 2025](../../references.md#google-embeddinggemma-300m);
[Google, 2025](../../references.md#google-siglip2-base-patch16-224);
[Microsoft, 2024](../../references.md#microsoft-florence-2-base-ft);
[OpenAI, 2021](../../references.md#openai-clip-vit-base-patch32);
[BAAI, 2023](../../references.md#baai-bge-small-en-v1-5);
[OpenAI, 2022a](../../references.md#openai-whisper-base);
[OpenAI, 2022b](../../references.md#openai-whisper-tiny);
[Sentence Transformers, n.d.](../../references.md#sentence-transformers-all-mpnet-base-v2);
[Xenova, n.d.-a](../../references.md#xenova-all-minilm-l6-v2);
[Xenova, n.d.-b](../../references.md#xenova-all-mpnet-base-v2)), the Florence-2
and SigLIP 2 papers
([Xiao et al., 2023](../../references.md#xiao-2023-florence-2);
[Tschannen et al., 2025](../../references.md#tschannen-2025-siglip-2)), and
pinned ONNX repositories
([ONNX Community, n.d.-a](../../references.md#onnx-community-embeddinggemma-300m-onnx);
[ONNX Community, n.d.-b](../../references.md#onnx-community-florence-2-base-ft);
[ONNX Community, n.d.-c](../../references.md#onnx-community-siglip2-base-patch16-224-onnx);
[ONNX Community, n.d.-d](../../references.md#onnx-community-whisper-base)).
These sources informed the pinned MPNet, Florence-2 Base, SigLIP 2 Base, and
Whisper Base production defaults, plus their derived-data migration identities.

## Historical product influences

Companies, people, files, and codebases Pond learned from.

### Companies

- **Linear Agent** ([Linear, n.d.-j](../../references.md#linear-agent-docs)) — observed text shimmer and changing activity labels informed Pond's running-status presentation. Activity events ([Linear, n.d.-d](../../references.md#linear-agent-interaction)) informed the connection to actual tool execution. A user-supplied Agent personalization screenshot informed Intelligence Personalization: section title and description above a textarea card, without a storage caveat under the list.
- **Linear** ([Linear, n.d.-i](../../references.md#linear-app)) — filter chips, saved views,
  Insights ([Linear, n.d.-g](../../references.md#linear-app-docs-insights)) and
  Dashboards ([Linear, n.d.-b](../../references.md#linear-app-docs-dashboards)) informed the analytics page;
  filtering docs ([Linear, n.d.-e](../../references.md#linear-app-docs-filters)) informed the query model.
  User-supplied workspace-menu and settings screenshots informed the nested Library switcher and the placement of Library customization.
  The Linear Method ([Linear, n.d.-l](../../references.md#linear-app-method)),
  changelog ([Linear, n.d.-a](../../references.md#linear-app-changelog)),
  Now ([Linear, n.d.-k](../../references.md#linear-app-now)),
  labels ([Linear, n.d.-h](../../references.md#linear-app-docs-labels)),
  dashboards best practices ([Linear, n.d.-c](../../references.md#linear-app-now-dashboards-best-practices)), and
  how we built triage intelligence ([Linear, n.d.-f](../../references.md#linear-app-now-how-we-built-triage-intelligence))
  informed product writing and analytics.
- **Family** ([Family, n.d.-c](../../references.md#family-co)) and
  **ConnectKit** ([Family, n.d.-b](../../references.md#family-co-docs-connectkit-theme-builder)) — the dock's
  morphing pill/tray interaction and modal page transitions. Family's iOS app
  on Mobbin ([Mobbin, n.d.-b](../../references.md#mobbin-com-apps-family-ios-91274a89-9f29-40f9-9b83-c7dae12d40b6-46088ce2-9ad5-4019-9ccc-6f8a050e9638-screens))
  was a primary dock/flow reference. Family Values ([Taylor, 2024](../../references.md#benji-org-family-values))
  is the essay behind that interaction model.
- **Vercel** ([Vercel, n.d.-f](../../references.md#vercel-com)) — Geist ([Vercel, n.d.-b](../../references.md#vercel-com-geist-colors)),
  empty states ([Vercel, n.d.-c](../../references.md#vercel-com-geist-empty-state)),
  writing guidelines ([Vercel, n.d.-h](../../references.md#github-com-vercel-labs-writing-guidelines)), and
  web interface guidelines ([Vercel, n.d.-g](../../references.md#github-com-vercel-labs-web-interface-guidelines)).
- **Apple** ([Apple, n.d.-a](../../references.md#developer-apple-com-design-human-interface-guidelines)) —
  HIG, Icon Composer ([Apple, n.d.-b](../../references.md#developer-apple-com-icon-composer)), and liquid-glass
  window chrome.
- **Eagle** ([Eagle, n.d.-ae](../../references.md#eagle-cool)) — local-first media library.
  Tags ([Eagle, n.d.-bi](../../references.md#en-eagle-cool-support-article-tags)),
  organizing tags ([Eagle, n.d.-ax](../../references.md#en-eagle-cool-support-article-organizing-tags)),
  detail mode ([Eagle, n.d.-y](../../references.md#eagle-cool-support-article-detail-mode)), and
  desktop search ([Eagle, n.d.-x](../../references.md#eagle-cool-support-desktop-search)).
  Shortcut customization ([Eagle, n.d.-w](../../references.md#eagle-cool-support-article-customize-shortcuts))
  and the macOS app-data location
  ([Eagle, n.d.-o](../../references.md#en-eagle-cool-support-article-cannot-find-application-support))
  informed the local Eagle shortcut importer.
- **PandaDoc** ([Mobbin, n.d.-k](../../references.md#mobbin-pandadoc-bulk-import-progress)) —
  its completed-item count and per-item processing state informed the Eagle import progress toast.
- **Cosmos** ([Cosmos, n.d.](../../references.md#cosmos-so)) and **Are.na** ([Are.na, n.d.-a](../../references.md#are-na)) —
  capture sources and grid/collection layout. Cosmos collections used as layout
  references include Linus Rogge ([Rogge, n.d.](../../references.md#cosmos-so-linusrogge)),
  Maximilian Stallboerger ([Stallboerger, n.d.](../../references.md#cosmos-so-stallboerger)), and
  Amelie Schltr ([Schltr, n.d.](../../references.md#cosmos-so-amelieschltr)).
- **Raycast** ([Raycast, n.d.-a](../../references.md#raycast-com)) — settings layout
  (manual ([Raycast, n.d.-b](../../references.md#manual-raycast-com-settings))).
  The installed AI settings ([Raycast, n.d.-a](../../references.md#raycast-com)) informed Intelligence's Providers and Personalization split, defaults-first ordering, and grouped profile fields. The user-supplied Raycast model table informed earlier provider detail pages and model visibility controls. A later user-supplied Cursor model-picker screenshot informed compact row density, short Input/Output/Context columns, and `200k`-style tokens; speed and intelligence meters were not copied because Pond has no verified ratings. The Vercel AI Gateway models list ([Vercel, n.d.-j](../../references.md#vercel-gateway-models-list)) informed moving that catalog onto one Intelligence Models page with Model, Provider, Input, Output, Context, and Show columns. Type, Tags, Latency, ZDR, and Free Tier were not copied. Compact `$n/M` prices, `200K` context, and header/cell tooltips follow that table’s density and hover pattern: headers define the column, cells expand the abbreviation. Pond wording does not use Gateway routing or credit copy. Context metadata and pagination follow [Anthropic (n.d.)](../../references.md#anthropic-models-api) and [Google (n.d.)](../../references.md#google-models-api).
- **Cursor** ([Mobbin, n.d.-j](../../references.md#mobbin-cursor-model-selector)) — the compact Agent model menu and side-submenu structure. Pond keeps unsupported controls visible but unavailable and retains its own provider metadata and settings navigation.
- **Cursor MCP** ([Cursor, n.d.-b](../../references.md#cursor-mcp)) and connecting local MCP servers ([Model Context Protocol, n.d.-a](../../references.md#modelcontextprotocol-connect-local)) informed Intelligence MCP: the live stdio command and no hosted URL. **Resurf** ([Resurf, n.d.](../../references.md#resurf-so)) informed the Access switches, always-visible host list, setup popover, More Agents, and Advanced command. A later menu-bar screenshot informed replacing tray recents with create and import actions, Search, Settings, and a version footer. Host CLI copy follows Claude Code MCP ([Anthropic, n.d.-c](../../references.md#anthropic-claude-code-mcp)), Codex MCP ([OpenAI, n.d.-d](../../references.md#openai-codex-mcp)), and Gemini CLI MCP ([Google, n.d.-c](../../references.md#google-gemini-cli-mcp)).
- **Seline** ([Seline, n.d.](../../references.md#seline-com)) and **Visitors** ([Visitors, n.d.](../../references.md#visitors-now)) —
  quiet, minimal analytics dashboards.
- **Campsite** ([Campsite, n.d.](../../references.md#github-com-campsite-campsite)) — settings atoms and
  composed page structure.
- **Immich** ([Immich, n.d.](../../references.md#immich-app)) and **PhotoPrism** ([PhotoPrism, n.d.](../../references.md#photoprism-app)) —
  library grid packing, placeholders, and ingest-time dimensions.
- **ArchiveBox** ([ArchiveBox, n.d.](../../references.md#github-com-archivebox-archivebox)) — local-first web archive
  prior art.
- **Bklit** ([Bklit, n.d.-b](../../references.md#bklit-com-docs-components)) — chart component composition.
- **Round** ([Round, n.d.](../../references.md#round-ai)) and **Aave** ([Aave, n.d.](../../references.md#aave-com-design-building-glass-for-the-web)) —
  glass treatments for the tray and window chrome.
- **Polar** ([Polar, n.d.](../../references.md#polar-sh)) — Orbit ([Polar, 2026](../../references.md#polar-sh-blog-orbit-llm-safe-design-system)),
  an LLM-safe design system.
- **Nucleo** ([Nucleo, n.d.](../../references.md#nucleoapp-com)) — UI glyph library.
- **Base UI** ([MUI, n.d.](../../references.md#base-ui-com)) (MUI) — primitives `@pond/ui` wraps.
- **Electron** ([Electron, n.d.-c](../../references.md#electronjs-org)) — desktop shell.
- **JetBrains** ([JetBrains, n.d.-a](../../references.md#jetbrains-com)) — JetBrains Mono.
- **bob.fyi** ([bob.fyi, n.d.-a](../../references.md#bob-fyi)) — Theming ([bob.fyi, 2026](../../references.md#bob-fyi-posts-theming)),
  OKLCH colors ([bob.fyi, n.d.-c](../../references.md#bob-fyi-oklch-colors)),
  clip-path curve ([bob.fyi, n.d.-b](../../references.md#bob-fyi-posts-clip-path-curve)), and the
  playground ([bob.fyi, n.d.-d](../../references.md#bob-fyi-playground)). Pond's `--ds-*` engine follows that model.
- **Amie** ([Amie, n.d.](../../references.md#amie-so)) — calendar UI, density, and motion.
- **Shiori** ([Shiori, n.d.](../../references.md#shiori-sh)) — bookmark/archive product reference.
- **Norma** ([Norma, n.d.](../../references.md#nor-ma)) — marketing-site composition (full-bleed hero, glass nav).
- **Glass** ([Glass, n.d.](../../references.md#glassapp-dev)) — liquid-glass treatments.
- **OpenStatus** ([OpenStatus, n.d.-a](../../references.md#data-table-openstatus-dev)) — data-table filters
  (also openstatusHQ/data-table-filters ([OpenStatus, n.d.-b](../../references.md#github-com-openstatushq-data-table-filters))).
- **Kumo UI** ([Kumo UI, n.d.](../../references.md#kumo-ui-com)) and **Beautiful UI** ([Beautiful UI, n.d.](../../references.md#beautifului-dev)) —
  component galleries.
- **Nelson** ([Nelson, n.d.](../../references.md#nelson-co-section-icons)) — icon craft.
- **Wordmarks** ([Wordmarks, n.d.](../../references.md#wrdmrks-com)) — wordmark / extract tools.
- **Lance Draws** ([Lance Draws, n.d.](../../references.md#lancedraws-com)) — illustration and mark work.
- **Stacher** ([Stacher, n.d.](../../references.md#stacher-io)) — local yt-dlp Mac app, peer for video download UX.
- **Helium** ([imputnet, n.d.](../../references.md#github-com-imputnet-helium)) — private browser chrome (tab-strip behavior, not a library).
- **Distill** ([Distill, n.d.](../../references.md#distill-id)) and **Interfere** ([Interfere, n.d.](../../references.md#interfere-com)) —
  product-site references.
- **Logging Sucks** ([Logging Sucks, n.d.](../../references.md#loggingsucks-com)) — logging/status copy.
- **Lisse** ([JaceThings, n.d.](../../references.md#github-com-jacethings-lisse)) — local library prior art.

### Figma

- Pond ([“Pond”, n.d.](../../references.md#figma-com-design-nlxaw3ytdxoprs7o5ramgg-pond)) — product file.
- Pond (working) ([“Pond (working)”, n.d.](../../references.md#figma-com-design-asplhoyirn54kpedlw4ix2-pond)) —
  later screens (library, settings).
- Browser Mockups by Shiryoku ([Shiryoku, n.d.](../../references.md#figma-com-design-q6vqvdig4xqjfxzv6t1opv-browser-mockups-by-shiryoku-community)) —
  website / extension mock chrome.
- Base UI Starter Kit ([“Base UI Starter Kit”, n.d.](../../references.md#figma-com-community-file-1635549277397866186-base-ui-starter-kit-wip)) —
  community kit for Base UI primitives.

### Mobbin

Mobbin ([Mobbin, n.d.-g](../../references.md#mobbin-com)) was the screen-research library. Flows and apps
sent as references:

- Family iOS screens ([Mobbin, n.d.-b](../../references.md#mobbin-com-apps-family-ios-91274a89-9f29-40f9-9b83-c7dae12d40b6-46088ce2-9ad5-4019-9ccc-6f8a050e9638-screens)) and
  flows ([Mobbin, n.d.-a](../../references.md#mobbin-com-apps-family-ios-91274a89-9f29-40f9-9b83-c7dae12d40b6-46088ce2-9ad5-4019-9ccc-6f8a050e9638-flows))
- Family web ([Mobbin, n.d.-c](../../references.md#mobbin-com-apps-family-web-b048d513-cf88-4cc4-adec-bf211685cda0-bf4a3959-5ae2-4dc6-8a94-dd82ac1c379c-screens))
- Visitors ([Mobbin, n.d.-h](../../references.md#mobbin-com-sites-visitors-be4f217e-a272-45b0-a8b3-bcdc496e8cfe-ec294852-3439-457c-92ed-6829fbd4e1da-preview))
- Flows 06e62a8e ([Mobbin, n.d.-d](../../references.md#mobbin-com-flows-06e62a8e-b613-4921-8a07-fc22238ae7f4)) and
  4373fd95 ([Mobbin, n.d.-e](../../references.md#mobbin-com-flows-4373fd95-c2f6-4361-9c2d-34ce151bcee9))
- Laravel Cloud connected accounts ([Mobbin, n.d.-f](../../references.md#mobbin-com-screens-ec08f97b-89fa-4bfa-a6b1-100c4bb488ed)) and
  X profile actions ([Mobbin, n.d.-i](../../references.md#mobbin-com-screens-90f1a815-f89d-46c1-8cb7-53fca8371418))
  informed the source menu's grouped actions, contextual labels, and isolated disconnect action.

Scratch boards live locally in `.mobbin/` (gitignored).

### Writing

- Vercel writing guidelines ([Vercel, n.d.-h](../../references.md#github-com-vercel-labs-writing-guidelines))
- Linear Method ([Linear, n.d.-l](../../references.md#linear-app-method)) and
  changelog ([Linear, n.d.-a](../../references.md#linear-app-changelog))
- Vercel Geist empty state ([Vercel, n.d.-c](../../references.md#vercel-com-geist-empty-state))
- Family Values ([Taylor, 2024](../../references.md#benji-org-family-values))

### Articles & design writing

- bob.fyi — Theming ([bob.fyi, 2026](../../references.md#bob-fyi-posts-theming)),
  OKLCH colors ([bob.fyi, n.d.-c](../../references.md#bob-fyi-oklch-colors)), and
  clip-path curve ([bob.fyi, n.d.-b](../../references.md#bob-fyi-posts-clip-path-curve))
- Jim Nielsen — Big Sur-ification of macOS icons ([Nielsen, 2024](../../references.md#blog-jim-nielsen-com-2024-big-sur-ification-of-macos-icons))
- Motion — A View Transitions API for the rest of us ([Perry, 2026](../../references.md#motion-dev-magazine-a-view-transitions-api-for-the-rest-of-us))
- animations.dev ([“animations.dev”, n.d.](../../references.md#animations-dev)) and transitions.dev ([“transitions.dev”, n.d.](../../references.md#transitions-dev))
- Björn Ottosson — Oklab ([Ottosson, 2020](../../references.md#bottosson-github-io-posts-oklab))
- Polar — Orbit, an LLM-safe design system ([Polar, 2026](../../references.md#polar-sh-blog-orbit-llm-safe-design-system))
- performance.dev — How is Linear so fast? ([Brotzky, 2026](../../references.md#performance-dev-how-is-linear-so-fast-a-technical-breakdown))
- barvian.me — React exit animations ([Barvian, 2026](../../references.md#barvian-me-react-exit-animations))
- Vercel — Geist colors ([Vercel, n.d.-b](../../references.md#vercel-com-geist-colors))
- Wu Zhu — I reversed Linear's sync engine ([Wenzhao, 2025](../../references.md#dev-to-wzhudev-i-reversed-linears-sync-engine-to-see-how-it-works-3cj))

### People

| Person | X | Why they show up |
|---|---|---|
| [John Phamous](https://x.com/JohnPhamous) | [@JohnPhamous](https://x.com/JohnPhamous) | Empty states: one anatomy (icon, title, description, action), a real next step, never a dead-end search. See search is not a dead end ([Phamous, n.d.-a](../../references.md#x-com-johnphamous-status-2028534571466432740)), half empty state ([Phamous, n.d.-b](../../references.md#x-com-johnphamous-status-2028896962448376105)), 2070261175292682650 ([Phamous, n.d.-d](../../references.md#x-com-johnphamous-status-2070261175292682650)), and 2059322499570290812 ([Phamous, n.d.-c](../../references.md#x-com-johnphamous-status-2059322499570290812)). Geist EmptyState follows the same bar. |
| bob.fyi ([bob.fyi, n.d.-a](../../references.md#bob-fyi)) | — | Theming and OKLCH. See Theming ([bob.fyi, 2026](../../references.md#bob-fyi-posts-theming)), OKLCH colors ([bob.fyi, n.d.-c](../../references.md#bob-fyi-oklch-colors)), clip-path curve ([bob.fyi, n.d.-b](../../references.md#bob-fyi-posts-clip-path-curve)), and the playground ([bob.fyi, n.d.-d](../../references.md#bob-fyi-playground)). Pond's `--ds-*` engine follows that model. Figma: [@yobob](https://www.figma.com/@yobob). |
| [Rasmus Andersson](https://rsms.me/) | [@rsms](https://x.com/rsms) | Inter. |
| [Björn Ottosson](https://bottosson.github.io/) | [@bjornornorn](https://x.com/bjornornorn) | Oklab / OKLCH, used by the theme engine. |
| Jakub Antalik ([Antalik, n.d.](../../references.md#beam-jakubantalik-com)) | [@jakubantalik](https://x.com/jakubantalik) | `border-beam` on the extension toolbar. |
| Jim Nielsen ([Nielsen, 2024](../../references.md#blog-jim-nielsen-com-2024-big-sur-ification-of-macos-icons)) | [@jimniels](https://x.com/jimniels) | macOS icon language (Big Sur-ification). |
| [Dennis Brotzky](https://x.com/brotzky) | [@brotzky](https://x.com/brotzky) | UI references: 2046244639582372313 ([Brotzky, n.d.-b](../../references.md#x-com-brotzky-status-2046244639582372313)), 1884287348206137778 ([Brotzky, n.d.-a](../../references.md#x-com-brotzky-status-1884287348206137778)). |
| shadcn ([shadcn, n.d.](../../references.md#ui-shadcn-com)) | [@shadcn](https://x.com/shadcn) | Component / registry craft. Tweet ([shadcn [@shadcn], n.d.](../../references.md#x-com-shadcn-status-2070561306038653247)). |
| [Dominik Ferber](https://www.dferber.de/) | [@dferber90](https://x.com/dferber90) | Sent as a UI reference. Tweet ([Ferber, n.d.](../../references.md#x-com-dferber90-status-2073027573219549678)). |
| [notrab](https://www.notrab.dev/) | [@notrab](https://x.com/notrab) | Sent as a UI reference. Tweet ([notrab [@notrab], n.d.](../../references.md#x-com-notrab-status-2061119216594329817)). |
| Yihui Hu ([yihui-hu, n.d.](../../references.md#github-com-yihui-hu-pidgin)) | [@_yihui](https://x.com/_yihui) | Pidgin, local-first archive prior art. |
| [Jace Attard](https://ja.mt/) | [@JaceThings](https://x.com/JaceThings) | Lisse ([JaceThings, n.d.](../../references.md#github-com-jacethings-lisse)), local library prior art. |
| prinsss ([prinsss, n.d.](../../references.md#github-com-prinsss-twitter-web-exporter)) | — | X GraphQL bookmark capture. |
| Wu Zhu ([wzhudev, n.d.](../../references.md#github-com-wzhudev-reverse-linear-sync-engine)) | — | Linear sync-engine reverse-engineering. |
| Max Barvian ([Barvian, 2026](../../references.md#barvian-me-react-exit-animations)) | [@MBarvian](https://x.com/MBarvian) | React exit animations. |
| Shiryoku ([Shiryoku, n.d.](../../references.md#figma-com-design-q6vqvdig4xqjfxzv6t1opv-browser-mockups-by-shiryoku-community)) | [@mx_shiryoku](https://x.com/mx_shiryoku) | Browser mockup Figma community file. |
| Paco Coursey ([pacocoursey, n.d.](../../references.md#github-com-pacocoursey-cmdk)) | [@pacocoursey](https://x.com/pacocoursey) | Command palette composition studied for search (`cmdk`). |
| Bora Baloglu ([borabaloglu, n.d.](../../references.md#github-com-borabaloglu-cmdk-base)) | [@borabalogluu](https://x.com/borabalogluu) | Command palette composition studied for search (`cmdk-base`). |

### Code references

- family/connectkit ([Family, n.d.-a](../../references.md#github-com-family-connectkit)) — modal/tray
  component architecture.
- yihui-hu/pidgin ([yihui-hu, n.d.](../../references.md#github-com-yihui-hu-pidgin)) — local-first archive
  prior art.
- prinsss/twitter-web-exporter ([prinsss, n.d.](../../references.md#github-com-prinsss-twitter-web-exporter))
  — X GraphQL capture approach.
- wzhudev/reverse-linear-sync-engine ([wzhudev, n.d.](../../references.md#github-com-wzhudev-reverse-linear-sync-engine))
  — Linear's sync engine, reverse-engineered.
- Meridius-Labs/electron-liquid-glass ([Meridius-Labs, n.d.](../../references.md#github-com-meridius-labs-electron-liquid-glass))
  — macOS liquid-glass window effects.
- bklit/bklit-ui ([Bklit, n.d.-a](../../references.md#github-com-bklit-bklit-ui)) — chart primitives.
- webrecorder/warcio.js ([Webrecorder, n.d.-b](../../references.md#github-com-webrecorder-warcio-js)) and
  ReplayWeb.page ([Webrecorder, n.d.-a](../../references.md#replayweb-page)) — page archive format and viewer.
- openstatusHQ/data-table-filters ([OpenStatus, n.d.-b](../../references.md#github-com-openstatushq-data-table-filters))
  and data-table.openstatus.dev ([OpenStatus, n.d.-a](../../references.md#data-table-openstatus-dev)) — filter tables.
- PallavAg/liquid-glass-web-react ([PallavAg, n.d.](../../references.md#github-com-pallavag-liquid-glass-web-react))
  — web liquid-glass experiments, alongside
  electron-liquid-glass ([Meridius-Labs, n.d.](../../references.md#github-com-meridius-labs-electron-liquid-glass))
  and Electron PR 50415 ([“Electron pull request 50415”, n.d.](../../references.md#github-com-electron-electron-pull-50415)).
- willwearing/chromium-tabs ([willwearing, n.d.](../../references.md#github-com-willwearing-chromium-tabs)) —
  tab-strip behavior.
- blossom-carousel ([Blossom Carousel, n.d.-a](../../references.md#blossom-carousel-com);
  [Blossom Carousel, n.d.-b](../../references.md#blossom-carousel-com-docs-migration-guides-embla)) —
  carousel behavior and Embla migration.
- dnd kit ([dnd kit, n.d.](../../references.md#dndkit-com)) — toolbar reorder.
- Video.js ([Video.js, n.d.](../../references.md#videojs-org)) — video player reference.

## Agent composition

- [Linear (n.d.-i)](../../references.md#linear-app) informed slash formatting, structural Shift+Enter, and inline issue chips for Save mentions in the Agent composer. A user-supplied Cursor @-file screenshot informed inserting those mentions from `@`, drag, and Add to Chat rather than a stacked attachment row. [Meta (n.d.-a)](../../references.md#lexical-dev) provides the shared Markdown editor foundation.

Cloud model information uses the public Gateway catalog ([Vercel, n.d.-i](../../references.md#vercel-gateway-rest-api)), replacing bundled lists while retaining native connection IDs.
