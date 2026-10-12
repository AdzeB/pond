# Launch video

The site film at `apps/website/public/video/pond.mp4` is rendered from the real Pond renderer. Electron loads it offscreen with a fake `window.pond` bridge, sample saves, and a virtual clock. Every frame is a pure function of time, so a render is repeatable.

## Render

Run each step from `apps/desktop`.

1. Collect the sample media from your library into `.tmp/launch-video/fixtures`. `POND_LIBRARY` defaults to `~/Pond/Personal.pond`.

   ```bash
   node scripts/launch-video/collect.mjs
   ```

2. Build the app, Settings, and stage pages into `.tmp/launch-video/dist`.

   ```bash
   ./node_modules/.bin/vite build --config scripts/launch-video/vite.config.ts
   ```

3. Capture 1920×1080 at 30 fps to `.tmp/launch-video/out/stage.mp4`. Pass `--stills=1500,16200` to write PNGs at those times instead.

   ```bash
   ./node_modules/.bin/electron scripts/launch-video/capture.cjs
   ```

4. Encode the site cut with the soundtrack, and take the poster at 2 seconds.

   ```bash
   ffmpeg -i .tmp/launch-video/out/stage.mp4 -i soundtrack.m4a -map 0:v -map 1:a \
     -vf scale=1600:900:flags=lanczos -c:v libx264 -preset slow -crf 24 \
     -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 128k -shortest \
     ../website/public/video/pond.mp4
   ffmpeg -ss 2 -i .tmp/launch-video/out/stage.mp4 -frames:v 1 -vf scale=1600:-2 \
     -q:v 3 ../website/public/video/pond-poster.jpg
   ```

`probe.cjs` boots one page and saves a screenshot plus a log of bridge calls. Use it to find missing query handlers.

## Storyboard

| Time (s) | Beat | On screen |
| --- | --- | --- |
| 0 to 3.2 | Hook | Saves drift around "The web is a sea of information.", then gather in |
| 3.2 to 5.6 | Intro | Logo and "Introducing Pond" |
| 5.6 to 8.8 | From | "Save from" cycling through sources |
| 8.8 to 13.8 | Save | An X post is bookmarked, and Pond posts "Saved from X" |
| 13.8 to 19 | Sync | New saves stream into the library as sync actions |
| 19 to 23 | Own | Finder walks from `Personal.pond` into one save's files |
| 23 to 28 | Enrich | Settings › Processing switches on captions, text, and similarity |
| 28 to 34 | Find | "red" typed into search filters the grid |
| 34 to 40 | Ask | The Assistant answers with cited saves |
| 40 to 44.5 | Theme | Light preset changes to Mint, then Appearance changes to Dark |
| 44.5 to 49.5 | Connect | Settings › Model Context Protocol beside an agent calling `search_saves` |
| 49.5 to 56.5 | Layer, Try | Closing lines |
| 56.5 to 61 | Outro | Logo and pond.app |

## Where things live

- `src/renderer/src/dev/launch-video/stage/timeline.ts` holds the beats.
- `stage/camera.ts` places the app and Settings windows.
- `stage/script.ts` holds the timed actions inside them.
- `bridge.ts`, `fixtures.ts`, and `assistant.ts` stand in for the main process.
- `clock.ts` owns time for timers, `requestAnimationFrame`, `Date`, and CSS animations.
