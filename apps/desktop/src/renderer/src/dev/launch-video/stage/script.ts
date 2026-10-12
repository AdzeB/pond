/** What happens inside the app windows during each beat. */
import { QUESTION, SYNCED } from "../constants";
import { at, composeText } from "./actions";
import { BEATS } from "./timeline";

const SEARCH = '[aria-label="Search"]';
const MESSAGE = '[aria-label="Message Assistant"]';

at(0, "app", (d) => d.closePane());

for (let index = 0; index < SYNCED; index++) {
  at(BEATS.sync[0] + 1100 + index * 200, "app", (d) =>
    d.reveal(d.synced()[SYNCED - 1 - index] ?? ""),
  );
}

composeText(BEATS.find[0] + 1200, "app", SEARCH, "red");

at(BEATS.enrich[0] - 300, "settings", (d) => d.scrollTo("Details", 110));
at(BEATS.enrich[0] + 1700, "settings", (d) => d.toggle("Image Captions"));
at(BEATS.enrich[0] + 2300, "settings", (d) => d.toggle("Text in Images"));
at(BEATS.enrich[0] + 2900, "settings", (d) => d.toggle("Visual Similarity"));

at(BEATS.ask[0], "app", (d) => d.agent(true));
const asked = composeText(BEATS.ask[0] + 700, "app", MESSAGE, QUESTION, 32);
at(asked + 200, "app", (d) => d.key(MESSAGE, "Enter"));

at(BEATS.theme[0] - 300, "settings", (d) => d.section("appearance"));
at(BEATS.theme[0] + 1300, "settings", (d) => d.openSelect("Light"));
at(BEATS.theme[0] + 1900, "settings", (d) => d.pick("Mint"));
at(BEATS.theme[0] + 2600, "settings", (d) => d.openSelect("Appearance"));
at(BEATS.theme[0] + 3200, "settings", (d) => d.pick("Dark"));
at(BEATS.theme[1] + 50, "settings", (d) => d.resetPreferences());
at(BEATS.theme[1] + 50, "app", (d) => d.resetPreferences());

at(BEATS.connect[0] - 300, "settings", (d) => d.section("mcp"));
