# Eagle AI, assistant, and agent research

Research date: 2026-08-30. Primary sources only. This is a documentation and screenshot investigation, not a hands-on test of Eagle or its plugins. No app, plugin, provider, or integration was installed. Public documentation sometimes contains stale claims; conflicts are called out below. Versions are the latest visible in the inspected listings, not independently verified installed releases.

## What exists today

Eagle's AI offering is a collection of capabilities rather than one finished native chat assistant:

| Surface | Observed status | Evidence |
| --- | --- | --- |
| AI Search | Released official plugin; listing v1.0.5, 2026-06-17 | [Plugin listing](https://community.eagle.cool/plugin/ai-search) |
| AI Action | Released official plugin; listing v1.0.2, 2026-04-01 | [Plugin listing](https://community.eagle.cool/plugin/ai-action) |
| AI Models | Released shared configuration plugin; listing v1.0.0, 2026-04-01 | [Plugin listing](https://community.eagle.cool/plugin/ai-sdk) |
| MCP Server / Skill | Available official integration, **still explicitly Beta**; listing v0.3.1, 2026-05-19 | [Plugin listing](https://community.eagle.cool/plugin/mcp-server) |
| Eagle Agent | Native conversational interface described as an early exploration; no launch found in examined sources | [March 17 announcement](https://en.eagle.cool/blog/post/eagle-plugin-ai-search) |

These capabilities moved from the planned Eagle 5 beta to Eagle 4 plugins; Eagle 5 remains separate future runtime/interface work. Older “Eagle 5” teasers do not prove a current native assistant. [AI Search launch and product direction](https://en.eagle.cool/blog/post/eagle-plugin-ai-search)

## Search: separate visual and textual retrieval

**Visual similarity** accepts a reference image and finds related images by appearance. Existing Eagle images can be dragged onto the search-bar entry point; an external image can be pasted there. The entry can also be pinned in the filter toolbar. **Natural-language search** is semantic matching over existing filenames, descriptions, notes, and other searchable text. It does not directly understand image pixels from a text prompt. Assets with random names and no descriptive metadata give it little to retrieve. These are complementary search modes, not chat or full agent reasoning. [AI Search launch](https://en.eagle.cool/blog/post/eagle-plugin-ai-search)

The support guide says natural-language mode is not intended for complex logical query conditions. Each library has an independent index. Setup downloads appropriate model files, initializes the service, then prepares indexing. Windows NVIDIA and Apple Silicon support GPU acceleration; Intel Macs and Windows AMD/Intel GPUs currently use CPU mode. Eagle advertises 30–50× acceleration in some circumstances, but this is a vendor claim rather than our benchmark. [AI Search setup guide](https://en.eagle.cool/support/article/ai-search)

The plugin's analysis/retrieval are described as local and offline, with no asset upload and no search usage fee. Initial installation/model download still needs connectivity. Version 1.0.1 made indexing **opt-in per library**, overriding older support text that describes automatic indexing. Subsequent releases addressed stalled indexing, cleanup of idle/background processes, corrupt downloads, disk-space detection, and NVIDIA detection. These changelogs expose real onboarding and resource-management states worth designing for. [AI Search listing and changelog](https://community.eagle.cool/plugin/ai-search)

**Scope cautions:** no complete AI-supported file-extension matrix was found. Eagle's general ability to store many formats does not prove AI understanding of all those formats. Homepage “Cross-Source Search” language does not establish cross-library AI retrieval; the examined search documentation describes per-library indexes. Do not confuse local AI Search with external Pinterest/reverse-image-search plugins. [Homepage feature separation](https://en.eagle.cool/)

## AI Action: reusable library operations

The March 30 release centers on four combinable operations: content-based renaming, generated descriptions, assignment to **existing** folders, and tags guided by the user's taxonomy. An Action captures operations, a model, and custom instructions so a particular organizational method can be repeated. Description instructions can target OCR, UI structure, photographic composition, or brand context. Folder classification depends on a useful existing hierarchy; it is not described as inventing a new folder system. AI Search's visual index can help Actions infer organization from similar assets. [AI Action launch](https://en.eagle.cool/blog/post/eagle-plugin-ai-action)

The documented workflow is: configure a vision model, create an Action or start from a template/import, select images in the library, invoke AI Action through Plugins or `P`, pick the Action, and review its name, selected-file count, and operations. Optional instructions can be added for this run. Execution then reports individual file progress and original/generated values. The final **Confirm** closes the result window; it is not documented as withholding all mutations until approval. [Quick-start guide](https://en.eagle.cool/support/article/ai-action-quick-start)

The operation picker also includes Clear Info and Rating. Clear Info can remove descriptions, links, tags, folder memberships, or ratings. Version 1.0.2 adds reverting completed changes while execution is **paused**; it does not establish unlimited undo history. Manual-only Actions launched by shortcut may skip confirmation. Local execution needs a vision-capable model; the listing recommends substantial GPU resources and warns that local tagging/folder assignment can be unreliable. No fixed per-Action price, cost estimate UI, or provider budget ceiling was verified. [AI Action listing/changelog](https://community.eagle.cool/plugin/ai-action)

Eagle advises focused Actions, small representative test batches, and changing one variable at a time. It prioritizes descriptions/renames before classification, because names and descriptions improve retrieval without requiring mature taxonomies. Folder descriptions and tag-group definitions supply the classification criteria. Domain-specific instructions shape what is extracted. This is useful guidance for Pond: more generated tags do not automatically make a library easier to search. [AI Action best practices](https://en.eagle.cool/support/article/ai-action-best-practices)

**Unverified:** automatic execution on every import, schedules, persistent run history, restart/resume, approval of individual generated edits before write, and transactional rollback for arbitrary MCP operations. Early promotion mentions organizing on import, but the current inspected how-to demonstrates explicit selection and invocation. [Earlier MCP/Skill promotion](https://en.eagle.cool/blog/post/eagle-plugin-mcp-skill)

## Visually verified action interface

These are first-party support screenshots, downloaded without modification and inspected visually:

- [Action editor source](https://r2-web.eagle.cool/support/document/ai-action-quick-start/en/8e81e147-423c-45bd-ae0c-09b75e19c996.webp) — [local image](assets/eagle-ai-action-editor.webp). A modal over the still-visible library contains an icon/name/shortcut header and operation cards. Rename exposes AI Auto versus Manual, a provider-marked model selector, Fast versus Deep, casing style, explicit metadata/EXIF context checkboxes, and custom instructions. The footer keeps Create Action visible.
- [Results source](https://r2-web.eagle.cool/support/document/ai-action-quick-start/en/50ab187c-bed0-4b5f-94a6-283dfb3df02f.webp) — [local image](assets/eagle-ai-action-results.webp). Each result shows the item's thumbnail/title, a completion check, red struck-through original text, and green replacement text. A processed count and Confirm button sit at the bottom. The selected library image remains visible behind the modal.

**Design interpretation:** the valuable pattern is an item-specific change record. Pond could reuse the thumbnail/before/after vocabulary in an inline approval card without copying this large modal or its density. That would be a Pond proposal, not a claim about Eagle's approval behavior.

## Models: one configuration center, multiple purposes

Eagle AI Models centralizes credentials and model preferences for plugins that use it. Providers listed include OpenAI, Anthropic, Google, DeepSeek, Qwen, Ollama, LM Studio, and OpenAI-compatible endpoints. The last supports services beyond the named list. Local services need no API key. This is infrastructure, not a chat interface. [AI Models announcement](https://en.eagle.cool/blog/post/eagle-plugin-ai-sdk)

Setup requires Eagle 4 Build 20+. In Preferences → AI Models, users add a provider, enter a key and API base, and choose separate **Language** and **Vision** defaults. Additional providers can coexist. Configuration export/import exists, with keep/overwrite handling for duplicate providers. The docs do not establish whether export includes plaintext secrets or how stored keys are encrypted, so that needs verification before recommending configuration sharing. [Model setup guide](https://en.eagle.cool/support/article/eagle-ai-sdk)

Version 1.0.0 added manually entered model identifiers, allowing private/new models without catalog updates. Catalog model names are examples and should not be mistaken for verified availability across every account. [AI Models changelog](https://community.eagle.cool/plugin/ai-sdk)

For developers, Eagle exposes AI SDK v6-based text/object generation and streaming, configured-provider discovery, connection verification, and model listing. Plugins can inherit the relevant default, direct users to model settings if absent, and reload settings afterward. Dependencies are declared in the plugin manifest so Eagle can prompt installation. This supports one provider setup across several feature surfaces, while allowing feature-specific model choice. It does not imply arbitrary third-party plugins automatically share configuration. [Official AI SDK documentation](https://developer.eagle.cool/plugin-api/extra-module/ai-sdk)

## MCP and Skill: an external assistant operating Eagle

The documented scenarios include tag synonym/typo cleanup, multilingual tag translation, folder planning, metadata rewriting for selected files, and importing website imagery. The last combines an external agent's browsing ability with Eagle operations; it is not evidence of an embedded Eagle browser agent. These scenarios establish selected-file and metadata workflows at the product level, not an exact inventory of low-level file-read/export/delete endpoints. [MCP/Skill launch](https://en.eagle.cool/blog/post/eagle-plugin-mcp-skill)

The official MCP plugin starts a local service, normally `http://127.0.0.1:41596/mcp`. Cursor uses Streamable HTTP; Claude Desktop can use copied STDIO configuration. A read-only version query verifies the connection. Documentation demonstrates client-side execution permission and recommends a proposed change list, explicit affected scope, small batches, and backups. These are safety recommendations; the source does **not** demonstrate an enforced per-change Eagle approval gate.

Cloud inference may transmit filenames, tags, annotations, search criteria, and summaries. Local models generally avoid that cloud inference step, subject to the chosen client/service. A local MCP server alone does not make a cloud agent private. The Claude Desktop example includes separately granting filesystem access; it should not be copied as a least-privilege design without narrowing scope. [MCP setup, privacy, and permissions guide](https://en.eagle.cool/support/article/eagle-mcp-server)

### Confirmed tool families and controls

The official listing/changelog confirms:

- Enable/disable tools by category; disabled tools are not registered.
- Tag merge plus incremental tag-group additions/removals.
- Smart-folder create/query/update/delete, matching-item retrieval, and filter-rule discovery; this group defaults **off**.
- Image-region and video-timestamp annotation add/update/remove.
- Semantic and visual-similarity search tools, introduced as preview integrations requiring AI Search.
- A December 2025 fix preventing access from other LAN devices.

The plugin remains labeled Beta. A complete current tool schema, exact default set, authentication design, and per-folder enforcement were not available in the examined public material. Third-party GitHub servers with similar names are not authoritative descriptions of this plugin. [Official MCP listing/changelog](https://community.eagle.cool/plugin/mcp-server)

Skill mode packages instructions, helper scripts, and reference documents for compatible external agents. Eagle's Install Skill button copies the package into the selected skills directory. It still depends on the same running local Eagle service. Its distinction is loading a short description initially and detailed references on demand; Eagle claims lower token use than loading all MCP definitions. The guide lists Claude Code, Codex, Gemini CLI, OpenClaw, and Google Anti-Gravity as examples. These client claims were not separately tested. Both modes can coexist. [Eagle Skill guide](https://en.eagle.cool/support/article/eagle-skill)

## Privacy and pricing: avoid blanket statements

Eagle's generic AI privacy FAQ says AI plugins operate wholly locally. That blanket text is inconsistent with its more specific current provider and MCP documentation. Treat it as stale or limited to older local image-processing plugins, not as assurance covering cloud-backed Actions or external agents. This is a documentation conflict, not evidence of undisclosed behavior. [Generic privacy FAQ](https://en.eagle.cool/support/article/faq-do-eagle-ai-plugins-pose-privacy-concerns)

Costs should be separated into the Eagle application/license, optional plugin terms, and model/client usage. AI Search explicitly says free after plugin installation. AI Action uses a configured local or cloud vision service; no bundled unlimited inference entitlement was established. Exact current application pricing and provider token rates were outside this investigation. No cost-per-run UI or enforcement of a spending cap was demonstrated.

## Adjacent ecosystem: do not confuse it with the official assistant

The official plugin directory separately lists AI Image Enlarger, AI Background Remover, AI Eraser, Pinterest Visual Search, external Reverse Image Search, and Copy Image Text. These are task tools, not evidence of a conversational assistant that can orchestrate all of them. [Official directory](https://community.eagle.cool/plugins)

**AI Autotagger is third-party**, by Davey Barker. Its listing v11.0.0 (April 7) describes image/video analysis, customizable presets, tags/names/descriptions, provider selection, local options, and experimental Claude Code/Codex CLI support. It offers natural-language preset generation, preset folders/backups, password-protected key storage, configurable resizing, retries, and per-item status filtering. Its BYOK description says users pay the provider directly. These capabilities must not be attributed to Eagle's official AI Action. [Developer's marketplace listing](https://community.eagle.cool/plugin/4B56113D-EB3E-4020-A82C-6214FA08CB14)

## Implications for the Pond Assistant proposal

These are recommendations inferred from the evidence, not features Eagle has promised for Pond:

1. Make the operating scope visible: selected Saves, current collection, or library. Before a write, show the affected count and fields.
2. Render useful activity states: finding candidates, reading selected files, proposing edits, applying changes, completed/partial failure. A pulsing logo can accompany these, not replace them.
3. Add per-Save change previews with thumbnails and before/after values. Offer accept/reject and a bounded undo contract.
4. Promote a successful one-off request into a reusable Action only when useful; keep workflow authoring out of the everyday composer.
5. Inherit model setup across features, but distinguish language, vision, and local search capabilities. A provider name alone does not tell the user which task is supported.
6. Surface one clear disclosure when a specific operation sends content to a cloud service. Do not use a generic permanent privacy footer or imply that local storage means local inference.
7. Preserve good context and metadata: retrieval quality depends on what was captured and described, not just how conversational the UI looks.

## Research limitations

Several support pages appeared blank in the web text extractor. Their public HTML included the complete article in Next.js payloads; those article bodies were decoded for reading. The two screenshots were visually checked. No live authentication, tool execution, model request, library mutation, runtime benchmark, or billing flow was tested. No native Eagle Agent launch was found in the inspected announcements, support index, or official marketplace; absence of evidence is not proof that private development does not exist.

## Open questions before using Eagle as an implementation specification

- What is the complete current official MCP schema for content reads, imports, exports, trash/deletion, and connection/log inspection? Which operations default on?
- Are approvals structurally enforced or left to the external agent's prompt and client policy? Are permissions scoped to a library, folder, operation, or session?
- Can a user audit and undo a completed or interrupted run after restarting Eagle? What happens on partial failure?
- Which bytes are sent during cloud vision analysis: original files, thumbnails, transformed images, extracted text, metadata, or combinations? The MCP privacy examples are not a complete payload specification.
- Are API keys encrypted at rest and in exported settings? Can individual plugins read credentials, or only invoke models through the shared service?
- Which media formats have actual content understanding beyond thumbnails and metadata? Does video processing apply to official Actions or only specific third-party tools?
- Is automatic-on-import Action execution shipped and opt-in? Are there quotas, estimated costs, or cancel semantics for calls already in flight?
- What replaced the generic all-local AI privacy statement, and what is the release status of native Eagle Agent after the last announcement found?
