# LWG architecture / Rung 2

**North star:** author a website like an image composition, with live links, authored motion, and inspectable, portable output. Design decisions should be recorded as data instead of re-invented from generic prompts.

## Rung 2 implemented

- Versioned schema v2: `project.scenes[]` with `id`, `title`, `bg`, `duration`, `transition`, and scene-specific `layers[]`. Existing v1 `layers[]` migration is deliberate and tested.
- Storyboard editor: create/duplicate/delete/reorder scenes, retained global art style, independently authored per-scene layouts and entrance effects.
- Deterministic motion sampler (`src/timeline.js`) shared by the scrubber and playback. Each layer includes `delay` and `duration` fields, sampled without an animation library. Playback advances to subsequent scenes.
- Export: every scene becomes an anchorable full-height section with scene navigation, separate background, timing and viewport-activated entrance; standalone HTML, no remote dependencies.

## Implemented

- Static browser studio: canvas, selectable and draggable objects, layer reorder, inspector, and three starter art directions.
- Layer schema v1: `text`, `image`, `shape`, `link`, with geometry expressed as percentages, plus rotation, opacity, appearance and motion data.
- Animation palette: `none`, `float`, `drift`, `pulse`, `spin`, `reveal`, `hover-lift`, `magnetic`, `marquee`.
- Local persistence (`localStorage`), editable JSON import/export and standalone HTML export that embeds user-uploaded images (2 MB each).
- Motion preview, pointer dragging, keyboard nudge, reduced-motion behavior in editor and exported page.
- Reference style token extraction with Playwright, normalization to **DTCG 2025.10** typed values, a draft style profile, two Kimi-supplied reference profiles.
- No runtime CDN, cloud account, database or build step required for the editor and exported website.

## Deliberate boundaries

- This is a **multi-scene** editor, but each scene remains one artboard. Narrow screens reflow the artboard container, but do not yet have independent per-device compositions or authored mobile breakpoints.
- An uploaded image becomes a data URI in the export, so very large media should be optimized externally for production.
- Motion presets are deterministic CSS/DOM primitives, not a physics / Three.js / WebGL composition engine yet.
- Extracting design tokens from a URL is distinct from copying a website. Do not copy protected logos, images, brand assets or identifiable layouts without permission. The extracted profile is a draft for **original** designs.
- Vision-to-code, video-to-motion, screenshot diffs, Figma integration, and distinct routed web pages are future rungs, not completed features.
- HTML export provides a reliable portable base, not a code generator for arbitrary React components.

## Next rungs

1. **Rung 2:** multiple scenes and motion timelines DONE. Remaining: spatial anchors, container-breakpoint constraints, masks, snap guides, undo/redo, authored custom keyframes.
2. **Rung 3:** screenshot-based layout grammar plus user-approved semantic design tokens. Side-by-side reference capture and rendered image comparison, with explicit copyright boundaries.
3. **Rung 4:** orchestrated timelines via optional GSAP/Lenis and Three.js scene widgets behind progressive enhancement; viewport gating, reduced motion, FPS budgets.
4. **Rung 5:** user-provided agent bridge, visual edit protocol, page bundle, local model integration and optional export adapters for PhiOS/FieldAtlas/DomistikaXR.

## Security and accessibility

- Projects are sanitized on import. URLs accept http(s), approved image data URLs and local anchors, never JavaScript URLs.
- Editor text is generated through DOM `textContent`; export HTML escapes injected text and attributes.
- Unsupported input is rejected; image upload MIME types and size are capped; HTML output is a static page.
- Animations disable under `prefers-reduced-motion: reduce`.
- Need to add contrast audit, alt-text enforcement, keyboard order and automated assistive tech audits prior to a production release.
