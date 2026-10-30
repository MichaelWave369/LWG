# LWG · Living Website Generator

**Websites should feel like places, not cloned templates.** LWG is a local-first visual studio for composing animated, image-rich websites as layered scenes.

## Open the studio

LWG runs as static files with no npm install needed:

```bash
python3 -m http.server 8080
# Open http://localhost:8080
```

On GitHub Pages, the same repository root can be deployed with **Settings → Pages → Deploy from a branch → main / root** after merging this PR. The GitHub Pages URL would then be `https://michaelwave369.github.io/LWG/`.

## Rung 1 features

- Drag shapes, copy, text, and clickable link objects directly across a visual canvas.
- Add your own images by URL or by upload; image uploads can be embedded in exported HTML.
- Tune position, size, rotation, opacity, typography, timing and 9 movement behaviors.
- Switch between three starting visual art directions: **After Dark**, **Soft Matter**, **Signal / 90**.
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

The starting concept came from Kimi's supplied living website report and `web-engine.zip`, including an editorial brutalism profile, an aurora profile, an extractor and GSAP/Lenis demo. We kept the two profile briefs and **normalized their token files** under [`profiles/`](profiles/) instead of shipping their malformed dimension/easing values unchanged. The rewritten extractor is under [`tools/`](tools/). Motion in this Rung 2 studio is dependency-free; the optional heavy motion stack comes later.

See [Architecture / roadmap](docs/ARCHITECTURE.md). Licensed MIT.

Part of the **Enter the Field / Φ369 Labs** open ecosystem.
