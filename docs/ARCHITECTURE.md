# LWG architecture / Rung 4.0

**North star:** author a website like an image composition, with live links, authored motion, and inspectable, portable output. Design decisions should be recorded as data instead of re-invented from generic prompts.

## Rung 4.0 implemented: Design DNA foundation

- `src/design/tokens.js` owns six original profiles, a safe local-font allowlist, color sanitization, recoloring of token-matching layers, CSS token serialization and text/background contrast calculations.
- Project JSON remains version 2 with an optional sanitized `design` object; legacy projects derive default values from their profile.
- Editor Design DNA offers preview without mutation, apply, and single-step undo. Custom-layer overrides are preserved.
- `src/export.js` and the editor artboard use the same canonical typography and color values.
- The present contrast indicator is a narrow text/background advisory, not an automated accessibility certificate.
- Preview opens the normal Live sandbox with a temporary candidate render; a subsequent navigation or edit returns to the saved project.

## Rung 3 implemented: synchronized studio

- Workspace modes: Design, Split, Code and Live. The same canonical LWG v2 scene data powers all of them.
- Editable canonical JSON and custom CSS: `src/source.js` validates edits; `src/project.js` preserves optional `customCss`; `src/export.js` embeds that CSS into the same output shown in Live preview.
- Generated HTML is deliberately read-only in the Code panel. Arbitrary HTML-to-scene parsing is not implemented. Export output remains portable without a service.
- Live preview uses an opaque-origin sandboxed iframe (`allow-scripts` only), with desktop/tablet/mobile width controls. In-frame outgoing navigation is intentionally restricted.
- Local-first site-files explorer lists scenes, generated source, and existing image placements; no disk or cross-origin read permissions.
- Browsallax is a separate browser/research/operator app; use the launcher to open it, not to silently grant its operator new authority.

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

1. **Rung 3:** Dreamweaver-style workspace DONE. Remaining: syntax highlighting, CSS diagnostics, per-element safe HTML fragments and full undo/redo.
2. **Rung 4.0:** Design DNA foundation DONE. **Next Rung 4.1:** deterministic design quality checks; screenshot-based layout grammar and section-by-section visual comparison; image masks, responsive breakpoints, snap guides and asset library.
3. **Rung 5:** optional GSAP/Lenis / Three.js scene widgets with performance budgets and reduced-motion alternatives.
4. **Rung 6:** governed Browsallax inspection/export adapter, user-granted reference capture, visual critique receipts, and optional PhiOS/FieldAtlas/DomistikaXR exchange.

## Security and accessibility

- Projects are sanitized on import. URLs accept http(s), approved image data URLs and local anchors, never JavaScript URLs.
- Editor text is generated through DOM `textContent`; export HTML escapes injected text and attributes.
- Unsupported input is rejected; image upload MIME types and size are capped; HTML output is a static page.
- Animations disable under `prefers-reduced-motion: reduce`.
- Need to add contrast audit, alt-text enforcement, keyboard order and automated assistive tech audits prior to a production release.
