/** Renders the stage frame by frame offscreen and encodes it with ffmpeg. */
const { app, BrowserWindow } = require("electron");
const { spawn } = require("node:child_process");
const { join } = require("node:path");
const { mkdirSync, writeFileSync } = require("node:fs");
const { registerSchemes, handleSchemes, root } = require("./schemes.cjs");

const arg = (name, fallback) =>
  process.argv
    .find((a) => a.startsWith(`--${name}=`))
    ?.slice(name.length + 3) ?? fallback;
const WIDTH = 1920;
const HEIGHT = 1080;
const out = join(root, "out");
const stills = arg("stills", "")
  .split(",")
  .filter(Boolean)
  .map(Number)
  .sort((a, b) => a - b);
const fps = Number(arg("fps", 30));
const from = Number(arg("from", 0));
const to = arg("to", "");
const video = arg("out", join(out, "stage.mp4"));
const page = arg("page", "launch-video.html");

registerSchemes();
app.commandLine.appendSwitch("force-device-scale-factor", "1");
app.commandLine.appendSwitch("force-color-profile", "srgb");

function frame(win) {
  return win.webContents.capturePage().then((image) => {
    const size = image.getSize();
    return size.width === WIDTH && size.height === HEIGHT
      ? image
      : image.resize({ width: WIDTH, height: HEIGHT, quality: "best" });
  });
}

app.whenReady().then(async () => {
  mkdirSync(out, { recursive: true });
  handleSchemes();
  const win = new BrowserWindow({
    width: WIDTH,
    height: HEIGHT,
    show: false,
    useContentSize: true,
    webPreferences: {
      offscreen: true,
      contextIsolation: false,
      backgroundThrottling: false,
    },
  });
  win.webContents.setFrameRate(60);
  const errors = [];
  win.webContents.on("console-message", (e) => {
    if (e.level === "error") errors.push(e.message);
  });
  const stage = (code) => win.webContents.executeJavaScript(code);
  void win.loadURL(`stage://stage/${page}`);
  await new Promise((r) => win.webContents.once("did-finish-load", r));
  await stage(
    "new Promise((r) => { const tick = () => (window.__stage ? r() : setTimeout(tick, 50)); tick(); })",
  );
  if (!(await stage("__stage.ready()")))
    throw new Error("stage never became ready");
  const duration = to ? Number(to) : await stage("__stage.duration");
  const step = 1000 / fps;

  if (stills.length) {
    let reached = 0;
    for (const t of stills) {
      for (let s = reached; s < t; s += 100) await stage(`__stage.seek(${s})`);
      reached = t;
      await stage(`__stage.seek(${t})`);
      writeFileSync(
        join(out, `still-${String(t).padStart(5, "0")}.png`),
        (await frame(win)).toPNG(),
      );
      console.log(`capture: still ${t}`);
    }
    if (errors.length)
      console.log(
        `capture: ${errors.length} errors\n${errors.slice(0, 8).join("\n")}`,
      );
    app.quit();
    return;
  }

  const ffmpeg = spawn(
    "ffmpeg",
    [
      "-y",
      "-loglevel",
      "error",
      "-f",
      "rawvideo",
      "-pix_fmt",
      "bgra",
      "-s",
      `${WIDTH}x${HEIGHT}`,
      "-r",
      String(fps),
      "-i",
      "-",
      "-c:v",
      "libx264",
      "-preset",
      "medium",
      "-crf",
      "14",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      video,
    ],
    { stdio: ["pipe", "inherit", "inherit"] },
  );

  for (let s = 0; s < from; s += 100) await stage(`__stage.seek(${s})`);
  const total = Math.round((duration - from) / step);
  const started = Date.now();
  for (let index = 0; index < total; index++) {
    await stage(`__stage.seek(${from + index * step})`);
    const bitmap = (await frame(win)).toBitmap();
    if (!ffmpeg.stdin.write(bitmap))
      await new Promise((r) => ffmpeg.stdin.once("drain", r));
    if (index % 60 === 0) {
      const rate = (index + 1) / ((Date.now() - started) / 1000);
      console.log(`capture: frame ${index}/${total} (${rate.toFixed(1)} fps)`);
    }
  }
  ffmpeg.stdin.end();
  await new Promise((r) => ffmpeg.on("close", r));
  if (errors.length)
    console.log(
      `capture: ${errors.length} errors\n${errors.slice(0, 8).join("\n")}`,
    );
  console.log(`capture: wrote ${video}`);
  app.quit();
});
