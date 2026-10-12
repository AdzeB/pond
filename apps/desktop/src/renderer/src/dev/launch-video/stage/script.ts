/** What happens inside the app window during each beat. */
import { QUESTION } from "../constants";
import { at, composeText } from "./actions";
import { FILTER_AT } from "./camera";
import { closes, opens } from "./timeline";

const SEARCH = '[aria-label="Search"]';
const MESSAGE = '[aria-label="Message Assistant"]';
const WHITE = '[aria-label="Preset Colors"] button[aria-label="White"]';

at(0, (d) => {
  d.navigate("/");
  d.closePanes();
});

composeText(opens("find") + 450, SEARCH, "wardrobe", 75);
at(FILTER_AT, (d) => d.press('button[aria-label="Color"]'));
at(FILTER_AT + 550, (d) => d.press(WHITE));
at(FILTER_AT + 1250, (d) => d.key(WHITE, "Escape"));

at(closes("find") + 450, (d) => d.navigate("/assistant"));
const asked = composeText(opens("ask") + 500, MESSAGE, QUESTION, 32);
at(asked + 200, (d) => d.key(MESSAGE, "Enter"));
