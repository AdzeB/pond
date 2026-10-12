# Launch video

The site film at `apps/website/public/video/pond.mp4` is a white stage with staged scenes and the real Pond renderer. Electron loads both offscreen. The renderer runs in a cropped window with a fake `window.pond` bridge, sample saves, and a virtual clock. Every frame is a pure function of time, so a render is repeatable.

## Render

Run each step from `apps/desktop`.

1. Collect the sample media from your library into `.tmp/launch-video/fixtures`. `POND_LIBRARY` defaults to `~/Pond/Personal.pond`.

   ```bash
   node scripts/launch-video/collect.mjs
   ```

2. Build the app and stage pages into `.tmp/launch-video/dist`.

   ```bash
   ./node_modules/.bin/vite build --config scripts/launch-video/vite.config.ts
   ```

3. Capture 1920×1080 at 30 fps to `.tmp/launch-video/out/stage.mp4`. Pass `--stills=1500,16200` to write PNGs at those times instead.

   ```bash
   ./node_modules/.bin/electron scripts/launch-video/capture.cjs
   ```

4. Encode the site cut with the soundtrack, and take the poster at 2 seconds. The beats follow the soundtrack of the first cut, which you can restore with `git show af0ac81f:brag-output/brag.mp4 > soundtrack.mp4`.

   ```bash
   ffmpeg -i .tmp/launch-video/out/stage.mp4 -i soundtrack.mp4 -map 0:v -map 1:a \
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
| 0 to 3.6 | Sea | Saves drift around "The web is a sea of information.", then spiral in |
| 3.7 to 5.5 | Intro | Logo and "Introducing Pond" |
| 5.8 to 9 | Tagline | "Your own" cycles from social media archive to anything |
| 9.5 to 13.2 | Ticker | "Save from" rolls through the sources |
| 13.5 to 17.6 | Save | An X post is bookmarked in the browser |
| 17.9 to 24.6 | Sync | Saves fly from each source into a wall as the count climbs |
| 24.9 to 28.6 | Own | Finder walks from the library into one save's files |
| 28.9 to 33.4 | Enrich | One image gets a caption, text, colors, and tags |
| 33.8 to 38.5 | Find | "wardrobe" is typed, then the White color filter narrows the grid |
| 38.8 to 45.8 | Ask | The Assistant answers "Which red bags have I saved?" with the saves it used |
| 46.1 to 51.5 | Connect | Claude Code calls `search_saves` in a terminal |
| 52.1 to 58 | Thesis, Offer | Closing lines |
| 58.7 to 61 | End | The logo fades out |

Find and Ask show the real renderer. The other scenes are staged in `stage/`.

## Where things live

- `src/renderer/src/dev/launch-video/stage/timeline.ts` holds the beats.
- `stage/camera.ts` crops and lifts the app window.
- `stage/script.ts` holds the timed actions inside it.
- `bridge.ts`, `fixtures.ts`, and `assistant.ts` stand in for the main process.
- `clock.ts` owns time for timers, `requestAnimationFrame`, `Date`, and CSS animations.
