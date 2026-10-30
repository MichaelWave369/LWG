# LWG · Living Website Generator

**Websites should feel like places, not cloned templates.** LWG is a local-first visual studio for composing animated, image-rich websites as layered scenes.

## Open the studio

LWG runs as static files with no npm install needed:

```bash
python3 -m http.server 8080
# Open http://localhost:8080
```

On GitHub Pages, the same repository root can be deployed with **Settings → Pages → Deploy from a branch → main / root** after merging this PR. The GitHub Pages URL would then be `https://michaelwave369.github.io/LWG/`.

## Rung 4.1: ΦDesign Critic (local static audits)

- The **ΦDesign Critic** panel continuously scans the current project on saved edits, or on demand with **Scan design**.
- Findings are ordered by severity and include the rule, affected scene/layer, explanation and suggested remediation.
- Click a layer finding to jump to it in the editor; filter by Errors, Warnings or Notes.
- Download the complete deterministic, versioned JSON report without a remote service.
- Checks cover nonfunctional links and missing scene anchors, generic image alt text, remote image dependencies, clipping risks, tiny text/tap targets, continuous motion density and **estimated** text contrast against plain scene backgrounds.
- Audits never modify projects, grant permissions or auto-apply fixes. Contrast is skipped when known image/shape layers underlie text.
- **Limitations:** static analysis is not browser rendering, actual composited contrast, mobile accessibility testing, assistive-technology validation or a WCAG certificate.

## Rung 4.0: Design DNA foundation

- Six original art-direction presets: After Dark, Soft Matter, Signal / 90, Ember Library, Tidal Glass and Modern Print.
- Edit four design colors and an offline-safe system font from the **Design DNA** panel, then **Preview** in the isolated Live pane before **Apply**.
- Apply recolors only backgrounds and layers matching the previous design tokens. Independently customized layer colors are not overwritten.
- **Undo** restores the previous design state until the next persisted edit.
- Design tokens are sanitized and stored in existing project JSON v2; v1/v2 imports retain layers and receive defaults when no design object exists.
- Preview and HTML exports share the canonical color/font tokens; no remote fonts, component libraries or services are needed.
- A text-to-background WCAG contrast ratio is displayed as an advisory, not a replacement for full accessibility auditing.

## Rung 3: Dreamweaver-inspired Visual / Code / Live studio

- **Design**: the existing drag-and-drop scene canvas, motion timeline, layer inspector, storyboard and art-direction profiles.
- **Split**: visual canvas and editable source side-by-side (stacked when the window is narrow).
- **Code**: edit `styles/custom.css` and the canonical `lwg-project.json`, with Apply/Revert and validation. A change to a JSON layer is reflected on the canvas; changes from Design refresh JSON after source is applied.
- **Generated HTML**: inspect `index.html` as read-only source representing the *actual* exported page. HTML is **not** yet arbitrary two-way visual editing.
- **Live**: a sandboxed iframe renders the exported standalone HTML. Preview desktop/tablet/mobile widths; external navigation inside this sandbox is intentionally blocked.
- **Site files sidebar**: open source files, navigate scenes, jump to placed image layers. Images remain project/data-URI assets, not a browser-accessible disk folder.
- **Browsallax companion**: a launcher opens the separate Browsallax Web app. LWG does not claim to gain arbitrary remote-page DOM access or bypass browser origin permissions. See [integration strategy](docs/BROWSALLAX_STUDIO_BRIDGE.md).
- Project v2 schema stays compatible: optional `customCss` string is sanitized on import and included in standalone export; existing v1/v2 projects migrate as before. The CSS editor rejects remote imports, `url()`, and HTML breakouts to protect offline, portable output.

**Source of truth:** editable JSON + custom CSS + visual properties. Generated HTML is an output artifact, not a second competing source of truth. That avoids silently throwing away manually authored HTML that the scene model cannot represent yet.

## Rung 1 features

- Drag shapes, copy, text, and clickable link objects directly across a visual canvas.
- Add your own images by URL or by upload; image uploads can be embedded in exported HTML.
- Tune position, size, rotation, opacity, typography, timing and 9 movement behaviors.
- Switch between six starting visual art directions: **After Dark**, **Soft Matter**, **Signal / 90**.
- Inspect and reorder layers, duplicate/remove objects, preview motion, nudge with arrow keys.
- Local autosave; import/export editable JSON; download a **standalone HTML/CSS/JS website**.
- The editor and exported page have **no backend and no CDN dependencies**.

## Rung 2: Scenes & Motion Timeline

- Add, duplicate, delete and reorder up to 12 scenes from the storyboard strip. Each scene has its own name, color, duration (2–30 seconds), entrance transition and up to 80 layers.
- Edit layer start time and motion duration in milliseconds; inspect their tracks in the timeline, click tracks to seek, scrub the playhead, and play through all scenes in sequence.
- Choose a scene destination in a link object's inspector, or use the automatically generated scene navigation in exported HTML.
- Save and import project JSON **v2**. Existing v1 projects (including v1 browser autosaves) migrate into a single opening scene, preserving layers.
- Export multiple responsive, anchor-addressable scenes into **one standalone HTML document** with viewport entrance animations, independent layer motion and reduced-motion support.
- The timeline is deterministic and dependency-free. This rung does not claim full keyframe editing or spatial 3D scenes. Those remain future features.

### Editing flow

Use **+ New scene** to create another canvas. Set the scene's background, duration and entrance in the scene toolbar. Place text, shapes, images and links on each canvas. In the inspector, assign a motion behavior, start time and duration. Enable **Timeline preview**, then scrub or play the storyboard. **Export website** outputs all scenes and their navigation. Your browser autosave still works locally.

## Tests

```bash
npm test
```

Browser tests require an available Chromium binary; the repository's unit tests do not need third-party modules.

## Website reference design language extractor

```bash
npm install
npx playwright install chromium
node tools/extract-tokens.js https://example.com --out profiles/my-reference
```

This outputs `tokens.json` (DTCG 2025.10 typed tokens) and `style-profile.md` (an editable draft). Extraction samples computed CSS; it does not copy content, images or code. Respect site terms and permissions. A sampled token palette is a starting point, not automatically a complete, unique brand or visual identity.

## Original research kit

The starting concept came from Kimi's supplied living website report and `web-engine.zip`, including an editorial brutalism profile, an aurora profile, an extractor and GSAP/Lenis demo. We kept the two profile briefs and **normalized their token files** under [`profiles/`](profiles/) instead of shipping their malformed dimension/easing values unchanged. The rewritten extractor is under [`tools/`](tools/). Motion in this studio is dependency-free; the optional heavy motion stack comes later.

See [Architecture / roadmap](docs/ARCHITECTURE.md). Licensed MIT.

Part of the **Enter the Field / Φ369 Labs** open ecosystem.
