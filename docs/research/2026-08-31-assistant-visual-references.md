# AI interface references for Pond

Inspected August 31, 2026. The user clarified that Cosmos, Are.na, and Pinterest should supply saved AI interface inspiration, not their own gallery design. This research supersedes the initial suggestion to imitate their galleries. No production component was changed during this research pass.

The temporary visual reference board was retired during prototype cleanup. The source findings below remain as historical research.

## Strongest references

| Reference | Observed pattern | Application to Pond |
| --- | --- | --- |
| [Rich answer with inline image and sources](https://www.cosmos.so/e/161283060) | Prose, a notation image, and compact source cards in one answer | Place Save previews where they support the answer; keep evidence near the relevant claim |
| [AI search with visual choices](https://ie.pinterest.com/pin/3729612269037186/) | Short answer and a horizontal row of three profile cards | A compact, keyboard-accessible Save strip for lookups, with one expansion control |
| [Reviewable action cards](https://www.cosmos.so/e/1696638438) | Normal prose, compact report objects, and explicit Accept/Dismiss for changes | Render exact title, tag, and folder proposals with review controls; do not mix them up with search results |
| [Inline question and reply context](https://www.are.na/block/44690441) | Numbered options, visible selection, a replying-to strip at the composer | Ask a useful question in place without modal interruption; preserve free-text answers |
| [Compact work trace](https://www.are.na/block/43558664) | One grouped heading, nested operations, a file chip | Keep actual operations secondary, collapsible, and free of raw data or private reasoning |
| [AI Travel Planner App](https://ie.pinterest.com/pin/875176140102491333/) | Destination imagery between assistant prose and a follow-up | Make returned Saves part of the conversation; skip decorative rotations |
| [Feed for Cobot, Joyce Jiang](https://www.are.na/block/40087086) | In-progress activity becomes a useful resting summary with compact message count | Once an operation completes, emphasize the answer and retain a collapsed trace |

Titles above describe the inspected images. They are not asserted product names. The travel Pin credits Pickolab Studio; that attribution was not independently verified. Cobot's Are.na block explicitly identifies Joyce Jiang and links to the original post. Other authors are not identified when the source page does not name them. Static screenshots establish visual patterns, not functioning product behavior.

## Collections reviewed

- [Raphael's ui / ai](https://www.are.na/raphael-salaja/ui-ai-zp4xtuo9miw): all nine thumbnails, with detail views for the action cards and activity list
- [manu hun's ai](https://www.are.na/manu-hun/ai-aqfedf4m-g4): five references, with detail view for the work trace
- [UI | Conversational AI Agents](https://www.are.na/magic-balasinski/ui-conversational-ai-agents): the recent portion of the 177-block collection, with detail views for the question and Cobot feed
- [AI UI](https://www.cosmos.so/asantanilla/ai-ui): three references, including the rich-answer/source-card example
- [ui / ai / chat](https://www.cosmos.so/taytaym/ui-slash-ai-slash-chat): nine references; Mercury OS was inspected but is less directly useful for this output repair
- Pinterest searches for AI assistant chat UI and AI search results interfaces; selected actual response screens rather than welcome screens

Some broadly named Cosmos collections contained unrelated artwork or decorative landing screens. These were excluded instead of treated as evidence for response design. No external collections or Pins were edited, followed, or saved.

## Recommended next implementation

Keep the existing centered composer and shared header. The output should use short prose as its base, with small, typed objects inside the answer. A lookup needs a compact strip of actual Saves; a comparison needs structured Markdown or a table; a question needs choices; a proposed library change needs an explicit review card. Avoid making every answer use the same large boxed list.

For the current search screenshot, remove the repeated result heading and count. Give each Save enough image area to recognize it, maintain a concise title and source, and open it for detail. Keep the result strip bounded so it does not displace the whole conversation. Offer attachment at the item level without keeping arrow and plus icons permanently scattered down the response. Keep completed tool activity available but visually secondary.

This does not solve retrieval quality. A result with an unrelated-looking title can still match hidden metadata; better presentation must not invent relevance explanations. Any future short rationale must come from the actual matched content.
