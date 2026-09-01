# Assistant output prototype

Three structurally different answers to the same question: how should Pond combine a useful response with visual Saves, inline sources, and actions?

Run from the repository root:

```sh
pnpm --filter @pond/desktop exec vite --config prototypes/assistant-output/vite.config.ts
```

Open `http://127.0.0.1:4325/`. This standalone prototype follows the existing desktop prototype convention and uses Pond's logo, icons, and font. It does not import the live assistant or touch its conversations, provider, database, or IPC.

## Compare directions

- `?variant=inline`: concise prose, a small strip of visual Saves, and inline source previews.
- `?variant=editorial`: a visual answer with a hero reference and observations paired with images.
- `?variant=canvas`: conversation alongside a persistent reference board; tabs in the side panel.

The bottom switcher changes variants, Page / Side Panel, and Search Results / Comparison / Review Changes / Inline Question / New Chat. Left and right arrow keys change variants outside text inputs and other controls. The state inspector shows the in-memory state.

## Interactions

Click an image, title, or numbered source to navigate directly to `/save/:id`; there is no intermediate preview dialog. Back restores the conversation and draft. In the side-panel layout, the Save opens in the main area while the assistant stays alongside it. This standalone route uses sample data and mirrors the live app's existing `openSave` navigation; it does not open a real library record. Attach a Save to the composer, type `@` to find a Save, or `/` to pick an action. Send a message for a scripted reply, or stop it and recover the draft. Copy or quote an answer. Compare references in a Markdown table with an expandable CSS palette. Review individual Saves before applying a sample folder/tag change, then undo it. Use the inline question to put a direction in the composer. Header actions open chat history, start a chat, expand, or close the side panel.

All replies and search results are fixtures. The sample notes are authored for this prototype, not source quotations. Arbitrary questions do not call a real model or search the user's library. Changes disappear on reload. No winning direction has been selected or promoted into the app.

## Design evidence

The [reference board](http://127.0.0.1:4325/references.html) contains the AI interface examples sourced from Cosmos, Are.na, and Pinterest. Source links and observations are recorded in [the research notes](../../../../docs/research/2026-08-31-assistant-visual-references.md).

The variants explore conversational imagery and inline attribution, an editorial response, and a separate output object. They use the reference images as inspiration, not as evidence of unobserved product behavior.

## Sample image attribution

Photos are local copies for private prototype review. This is not a production asset license or permission to redistribute the photography.

- `cloister.jpg`: [The Cloister House by MORQ, The Local Project](https://thelocalproject.com.au/articles/the-cloister-house-by-morq-local-australian-architecture-bespoke-design-perth-wa-australia/).
- `monolith.jpg`: [M_001 by Monolith, Leibal](https://store.leibal.com/products/m_001).
- `mokko.jpg`: [Mokko at Thomaskerk, Thomas van Schaik](https://www.thomasvanschaik.com/still-life-interior-food-photography-commissioned-amsterdam/mokko-thomaskerk).
- `bank-street.jpg`: [Bank Street House, Technē; photograph by Tom Blachford](https://techne.com.au/projects/bank-street-house/).
- `floresta.jpg`: [Casa Floresta by Estúdio Zargos, Wallpaper](https://www.wallpaper.com/architecture/casa-floresta-estudio-zargos-belo-horizonte-brazil).

## Verification

Prototype-only TypeScript check and Vite build pass. Browser checks cover all three layouts, the main and side headers, close/reopen, @ attachment filtering, slash action selection, a scripted comparison reply, source previews outside table clipping, direct Save detail navigation and attachment, Back with draft preservation, selective review with undo, the reference tab, and an inline question. Production files and the running Electron app are unchanged by this prototype.
