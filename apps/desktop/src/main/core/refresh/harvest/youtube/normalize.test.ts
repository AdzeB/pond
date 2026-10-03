import { runInNewContext } from "node:vm";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { buildExpression } from "./item";

const caption = `#gregdoucette #leenbeefpatty #fitness

Game Changing TEST BOOSTER FERULA:
https://www.htltsupps.com/products/ferula

SCULPTD Training App:
https://www.sculptdapp.com/`;

const descriptionBox = `<div id="title"><h1>Leg day</h1></div>
<div id="description-inner">
  <div id="description-inline-expander">
    <div id="attributed-snippet-text">12345678901234567890123456789 123456<br>78901234567890123456789 K<br>views<br><br>12345678901234567890123456789<br>h ago<br><br>#gregdoucette #leenbeefpatty #fitness<br><br>153,002 views • Sep 29, 2026 • #gregdoucette #leenbeefpatty #fitness<br><br>Game Changing TEST BOOSTER FERULA:<br>https://www.htltsupps.com/products/fe...<br><br>SCULPTD Training App:<br>https://www.sculptdapp.com/ ...more</div>
    <button id="expand">more</button>
  </div>
</div>`;

async function harvest(
  html: string,
  player?: { videoDetails: { shortDescription: string } },
) {
  const { window } = new JSDOM(
    `<!doctype html><html><body>${html}</body></html>`,
    { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
  );
  return runInNewContext(buildExpression("dQw4w9WgXcQ"), {
    document: window.document,
    location: window.location,
    ytInitialPlayerResponse: player,
    setTimeout,
    clearTimeout,
  });
}

describe("youtube watch description", () => {
  it("saves the player caption instead of the description box", async () => {
    const page = await harvest(descriptionBox, {
      videoDetails: { shortDescription: caption },
    });
    expect(page?.description).toBe(caption);
  });

  it("leaves the description empty when the video has no caption", async () => {
    const page = await harvest(descriptionBox, {
      videoDetails: { shortDescription: "  " },
    });
    expect(page?.title).toBe("Leg day");
    expect(page?.description).toBeUndefined();
  });

  it("drops view counts, the digit probe, and the expand control when the player caption is missing", async () => {
    const page = await harvest(descriptionBox);
    expect(page?.description).toBe(`#gregdoucette #leenbeefpatty #fitness

Game Changing TEST BOOSTER FERULA:
https://www.htltsupps.com/products/fe...

SCULPTD Training App:
https://www.sculptdapp.com/`);
  });
});
