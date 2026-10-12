/** What happens inside the real app during the short cut. */
import { QUESTION } from "../constants";
import { at, composeText } from "../stage/actions";
import { ASK, ASK_STEP, FIND } from "./camera";

const SEARCH = '[aria-label="Search"]';
const MESSAGE = '[aria-label="Message Assistant"]';
const BROWN = '[aria-label="Preset Colors"] button[aria-label="Brown"]';

at(0, (d) => {
  d.navigate("/");
  d.closePanes();
});

composeText(FIND.type, SEARCH, "fall outfits", 70);
at(FIND.filter, (d) => d.press('button[aria-label="Color"]'));
at(FIND.filter + 550, (d) => d.press(BROWN));
at(FIND.filter + 1250, (d) => d.key(BROWN, "Escape"));

at(FIND.exit + 420, (d) => d.navigate("/assistant"));
composeText(ASK.type, MESSAGE, QUESTION, ASK_STEP);
at(ASK.send, (d) => d.press('button[aria-label="Send"]'));
