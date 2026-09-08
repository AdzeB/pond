# @pond/icons

UI glyphs come from the Nucleo UI React packages (`nucleo-ui-fill-*` and
`nucleo-ui-outline-*`). Import through the size barrels:

```ts
import { IconCalendarFill18 } from "@pond/icons/fill/18";
import { IconXmarkOutline12 } from "@pond/icons/outline/12";
```

Social and brand marks live under `social-media/custom/`. The Pond mark lives
in `brand/`: `icon.svg` is the vector source, and `tints/` holds Icon Composer
colorways. The desktop app defaults to `tints/aqua` for the Dock icon.

When you open-source Pond, extract only the glyphs you ship into this package
and drop the Nucleo dependencies. Until then, import any Nucleo UI icon from
the barrels.
