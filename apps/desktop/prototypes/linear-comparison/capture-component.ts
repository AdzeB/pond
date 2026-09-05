interface CapturedElement {
  tag: string;
  rect: { x: number; y: number; width: number; height: number };
  css: Record<string, string>;
  pseudo: Record<string, { css: Record<string, string>; hasGeneratedContent: boolean }>;
  state: Record<string, boolean>;
  svg?: Record<string, string>;
  children: Array<CapturedElement | null>;
  hasOpenShadowRoot: boolean;
}

export async function captureComponent(root: Element) {
  if (root === document.body || root === document.documentElement) {
    throw new Error("Select a component, not the whole document.");
  }
  await document.fonts.ready;
  const allowed =
    /^(display|position|inset|top|right|bottom|left|width|height|min-|max-|box-sizing|padding|margin|gap|row-gap|column-gap|align-|justify-|flex|grid|font|line-height|letter-spacing|text-align|text-transform|text-decoration|text-overflow|white-space|word-spacing|color$|background|border|box-shadow|outline|opacity|overflow|visibility|transform|translate|scale|rotate|transition|animation|filter|backdrop-filter|fill|stroke|paint-order|clip-path|mask|appearance|cursor|z-index)/;
  const safe = (value: string) =>
    !/url\(|(?:https?:|data:|file:)|@|attr\(/i.test(value);
  const readStyle = (element: Element, pseudo?: string) => {
    const css = getComputedStyle(element, pseudo);
    return Object.fromEntries(
      [...css]
        .filter((key) => allowed.test(key))
        .map((key) => [key, css.getPropertyValue(key)])
        .filter(([, value]) => safe(value ?? "")),
    );
  };
  const bounds = root.getBoundingClientRect();
  const rect = (element: Element) => {
    const box = element.getBoundingClientRect();
    return {
      x: box.x - bounds.x,
      y: box.y - bounds.y,
      width: box.width,
      height: box.height,
    };
  };
  const svgTags = new Set([
    "svg",
    "g",
    "path",
    "rect",
    "circle",
    "ellipse",
    "line",
    "polyline",
    "polygon",
  ]);
  const svgAttributes = new Set([
    "viewBox",
    "d",
    "x",
    "y",
    "x1",
    "x2",
    "y1",
    "y2",
    "width",
    "height",
    "rx",
    "ry",
    "r",
    "cx",
    "cy",
    "points",
    "fill",
    "fill-rule",
    "clip-rule",
    "stroke",
    "stroke-width",
    "stroke-linecap",
    "stroke-linejoin",
    "transform",
    "opacity",
  ]);
  let count = 0;
  let truncated = false;
  const visit = (element: Element, depth: number): CapturedElement | null => {
    if (count >= 250 || depth > 12) {
      truncated = true;
      return null;
    }
    count++;
    const pseudo = Object.fromEntries(
      ["::before", "::after"].flatMap((name) => {
        const content = getComputedStyle(element, name).content;
        return content !== "none" && content !== "normal"
          ? [
              [
                name,
                { css: readStyle(element, name), hasGeneratedContent: true },
              ],
            ]
          : [];
      }),
    );
    return {
      tag: element.localName,
      rect: rect(element),
      css: readStyle(element),
      pseudo,
      state: Object.fromEntries(
        [
          "hover",
          "focus",
          "focus-visible",
          "active",
          "disabled",
          "checked",
        ].map((state) => [state, element.matches(`:${state}`)]),
      ),
      svg:
        element.namespaceURI === "http://www.w3.org/2000/svg" &&
        svgTags.has(element.localName)
          ? Object.fromEntries(
              [...element.attributes]
                .filter(
                  (attribute) =>
                    svgAttributes.has(attribute.name) && safe(attribute.value),
                )
                .map((attribute) => [attribute.name, attribute.value]),
            )
          : undefined,
      children: [...element.children]
        .filter(
          (child) => !["script", "style", "iframe"].includes(child.localName),
        )
        .map((child) => visit(child, depth + 1)),
      hasOpenShadowRoot: Boolean(element.shadowRoot),
    };
  };
  const ancestors = [];
  let parent = root.parentElement;
  for (
    let depth = 0;
    parent && depth < 6;
    depth++, parent = parent.parentElement
  ) {
    ancestors.push({
      tag: parent.localName,
      css: readStyle(parent),
      rect: rect(parent),
    });
  }
  const tree = visit(root, 0);
  return {
    version: 2,
    capturedAt: new Date().toISOString(),
    viewport: {
      width: innerWidth,
      height: innerHeight,
      pixelRatio: devicePixelRatio,
      scale: visualViewport?.scale ?? 1,
    },
    tree,
    ancestors,
    count,
    truncated,
    exclusions: [
      "Text, input values, URLs, arbitrary attributes and CSS custom properties",
      "URL-based paint, external SVG references and generated text",
      "Shadow-root contents, authored rules and states not currently active",
    ],
  };
}
