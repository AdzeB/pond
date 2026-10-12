# Launch video

The site film at `apps/website/public/video/pond.mp4` is a white stage with staged scenes and the real Pond renderer. Electron loads both offscreen. The renderer runs in a cropped window with a fake `window.pond` bridge, sample saves, and a virtual clock. Every frame is a pure function of time, so a render is repeatable.

## Render

Run each step from `apps/desktop`.

1. Collect the sample media into `.tmp/launch-video/fixtures`. `library.json` lists every save. Seed saves come from the demo library in git history, and the rest are copied from your library. `POND_LIBRARY` defaults to `~/Pond/Personal.pond`.

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

4. Encode the site cut with the soundtrack, and take the poster at 2 seconds. The beats follow the soundtrack of the first cut, minus its tagline and ticker from 5.83 to 13.52 seconds. The first command restores that soundtrack from git and splices out the gap.

   ```bash
   git show af0ac81f:brag-output/brag.mp4 > first-cut.mp4
   ffmpeg -i first-cut.mp4 -filter_complex \
     "[0:a]atrim=0:5.87,asetpts=PTS-STARTPTS[a];[0:a]atrim=13.52,asetpts=PTS-STARTPTS[b];[a][b]acrossfade=d=0.04[out]" \
     -map "[out]" -c:a aac -b:a 192k soundtrack.m4a
   ffmpeg -i .tmp/launch-video/out/stage.mp4 -i soundtrack.m4a -map 0:v -map 1:a \
     -vf scale=1600:900:flags=lanczos -c:v libx264 -preset slow -crf 24 \
     -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 128k -shortest \
     ../website/public/video/pond.mp4
   ffmpeg -ss 2 -i .tmp/launch-video/out/stage.mp4 -frames:v 1 -vf scale=1600:-2 \
     -q:v 3 ../website/public/video/pond-poster.jpg
   ```

`probe.cjs` boots one page and saves a screenshot plus a log of bridge calls. Use it to find missing query handlers.

## Short cut

`launch-video-short.html` is a 28.3 second cut for posting, on white. The wordmark opens it and the sources drop into a folder. A title card leads into each of Save, Find, and Ask, which show whole windows. Each scene dims around one component while the camera pushes in. The `pond.app` end card closes it. Capture it with `--page`, then mix "Happy Beats vol. 1" from 38.7 seconds, so the lift lands on Save and the hit on the end card.

```bash
./node_modules/.bin/electron scripts/launch-video/capture.cjs \
  --page=launch-video-short.html --out=.tmp/launch-video/out/short.mp4
ffmpeg -ss 38.7 -t 28.3 \
  -i ../../.agents/skills/brag/assets/music/happy-beats-business-moves-vol-1-by-ende-dot-app.mp3 \
  -af "afade=t=in:d=0.08,afade=t=out:st=27.1:d=1.2,volume=0.9" -c:a aac -b:a 192k short.m4a
ffmpeg -i .tmp/launch-video/out/short.mp4 -i short.m4a -map 0:v -map 1:a \
  -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -movflags +faststart \
  -c:a copy -shortest short-cut.mp4
```

Its scenes live in `src/renderer/src/dev/launch-video/short/`. `timeline.ts` holds the scenes, `camera.ts` holds the app's crops, spotlights, and pointer, and `script.ts` holds the actions inside the app.

## Storyboard

| Time (s) | Beat | On screen |
| --- | --- | --- |
| 0 to 3.6 | Sea | Saves drift around "The web is a sea of information.", then spiral in |
| 3.7 to 5.8 | Intro | Logo and "Introducing Pond" |
| 5.8 to 10.2 | Save | An X post is bookmarked in the browser |
| 10.2 to 17.2 | Sync | Saves fly from each source into a wall as the count climbs |
| 17.2 to 21.2 | Own | Finder walks from the library into one save's files |
| 21.2 to 26.1 | Enrich | One image gets a caption, text, colors, and tags |
| 26.1 to 31.1 | Find | "fall outfits" is typed, then the Brown color filter narrows the grid |
| 31.1 to 38.4 | Ask | The Assistant answers "What did I save for the studio?" with the saves it used |
| 38.4 to 44.4 | Connect | Claude Code calls `search_saves` in a terminal |
| 44.4 to 50.8 | Thesis, Offer | Closing lines |
| 51.1 to 53.3 | End | The logo fades out |

The timing matches the first cut without its tagline and ticker. Find and Ask show the real renderer. The other scenes are staged in `stage/`.

## Where things live

- `src/renderer/src/dev/launch-video/stage/timeline.ts` holds the beats.
- `stage/camera.ts` crops and lifts the app window.
- `stage/script.ts` holds the timed actions inside it, and `stage/pointer.ts` moves the pointer over it.
- `bridge.ts`, `fixtures.ts`, and `assistant.ts` stand in for the main process.
- `clock.ts` owns time for timers, `requestAnimationFrame`, `Date`, and CSS animations.
