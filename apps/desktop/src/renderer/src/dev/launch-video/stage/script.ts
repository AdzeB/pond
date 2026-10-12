/** What happens inside the app window during each beat. */
import { QUESTION } from "../constants";
import { at, composeText } from "./actions";
import { ASK_AT, ASK_STEP, FILTER_AT, SEND_AT } from "./camera";
import { closes, opens } from "./timeline";

const SEARCH = '[aria-label="Search"]';
const MESSAGE = '[aria-label="Message Assistant"]';
const BROWN = '[aria-label="Preset Colors"] button[aria-label="Brown"]';

at(0, (d) => {
  d.navigate("/");
  d.closePanes();
});

composeText(opens("find") + 630, SEARCH, "fall outfits", 75);
at(FILTER_AT, (d) => d.press('button[aria-label="Color"]'));
at(FILTER_AT + 550, (d) => d.press(BROWN));
at(FILTER_AT + 1250, (d) => d.key(BROWN, "Escape"));

at(closes("find") + 450, (d) => d.navigate("/assistant"));
composeText(ASK_AT, MESSAGE, QUESTION, ASK_STEP);
at(SEND_AT, (d) => d.press('button[aria-label="Send"]'));
