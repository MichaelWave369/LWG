# Style Profile: <NAME>  (one profile per aesthetic you love)

> This file is the anti-generic layer. It is injected into EVERY generation prompt.
> Be opinionated. The forbidden list matters more than the positive rules.

## Identity (3-5 words)
<e.g. "Editorial brutalism: oversized type, raw grid, neon accent">

## Colors
- background: `#...`   surface: `#...`   surface-alt: `#...`
- text: `#...`  muted: `#...`
- accent: `#...`  (used sparingly — links, hover, one element per viewport)
- Rule: <e.g. "never pure black/white", "accent appears max once per viewport">

## Typography
- Display font: `<family>` <weight> — used for H1-H2, sizes `<min>–<max>px`
- Body font: `<family>` <weight/size/line-height>
- Rule: <e.g. "headlines never exceed 2 lines", "never center display type">

## Layout
- Max width: `<px>`  Vertical rhythm: `<px>` between sections
- Grid: <e.g. "12-col, max 2 elements per row", "asymmetric 7/5 splits">
- Rule: <e.g. "no cards with borders", "no boxed sections">

## Signature elements (what makes it THIS site)
1. <e.g. "one marquee strip per page">
2. <e.g. "oversized outlined numerals as decoration">
3. <e.g. "images that scale 1.05 on hover">

## Motion language (see motion-spec.json)
- Entrances: <reveal type, duration, easing>
- Stagger: `<ms>` between children
- Scroll: <pinned sequences? parallax? scrub lag>
- Micro: <magnetic buttons? underline sweeps? cursor effects?>

## FORBIDDEN (kills the AI-generic look — do not generate these)
- ❌ gradient buttons / hero gradients
- ❌ drop shadows on cards
- ❌ rounded-2xl cards with borders
- ❌ centered hero with subtitle + 2 buttons + 3 feature cards
- ❌ emoji icons, ❌ stock-photo smiles, ❌ "Lorem ipsum"
- ❌ <anything else you keep seeing that you hate>
