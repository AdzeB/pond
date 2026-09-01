# Linear agent style extraction

Measured on August 31, 2026 from the signed-in [Linear agent page](https://linear.app/raphael-salaja/agent), using read-only computed styles and element bounds. This is the application UI, not Linear's marketing site.

- [tokens.css](tokens.css): 33 named CSS variables extracted from the measured components. Reference only; not imported into Pond.
- [computed-styles.json](computed-styles.json): element and ancestor measurements for the empty composer, header, chat menu, skills menu, existing messages, and reply composer. Generated class names and conversation text are omitted.

## Measured values

| Element | Observed style |
| --- | --- |
| Message text | Inter Variable, 15px, weight 450, 24px line height, −0.1px letter spacing |
| Composer text | Inter Variable, 15px, weight 450, 24px line height; normal letter spacing |
| Header | 44px high; title 13px, weight 500; chat trigger 28px high |
| Empty composer | 712px maximum width, 104px observed height, 12px outer padding, 10px radius |
| Composer editor inset | 2px vertically and 6px horizontally, inside the outer padding |
| Composer spacing | 8px between editor and toolbar; 24px toolbar controls |
| User message | 8px radius, 8px 12px padding, maximum width 75%, no shadow |
| Chat menu | 12px radius, 13px type, 19.5px line height, 32px rows |
| Menu row inset | 14px left, 18px right |
| Button transitions | 150ms for border, background color, color, and opacity |

The composer uses two weak shadow layers: `0 3px 6px -2px` at 2% black and `0 1px 1px` at 4% black. The menu uses three layers: `0 6px 18px` at 2%, `0 3px 9px` at 4%, and `0 1px 1px` at 4%. The exact LCH colors are retained in the CSS and JSON.

The reply composer was wider than the empty composer in this viewport: 821px versus 712px, with a 128px observed height. These are separate layouts; 712px is not a verified limit for every conversation state. Menu border thickness measured 0.5px in this browser configuration. Treat device-dependent geometry separately from design tokens.

## Applying the reference to Pond

The most useful changes would be the 15px/24px text rhythm, 44px shared header, 10px composer corners, lighter shadows, and compact 32px menu rows. Keep Pond's own typography assets, semantic colors, Save cards, and direct detail navigation. Keep the recently removed composer hints removed.

These are proposed mappings, not production changes. The extracted values are kept outside the application so they can be compared before adoption.

## Scope and limits

- Captured the current light theme and main agent page only. Dark colors, hover states, responsive breakpoints, rich Markdown tables, and streaming states were not measured.
- Used one existing greeting conversation to inspect message styles; sent no messages and changed no library, workspace data, or appearance preferences.
- Browser auto-review blocked “Move to toolbar” because it would change the signed-in UI without explicit authorization. That action was not performed; the compact toolbar variant is not included.
- This captures visible computed styles, not Linear's original component code, font files, complete stylesheet, or backend behavior.
