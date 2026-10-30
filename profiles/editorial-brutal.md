# Style Profile: Editorial Brutal

## Identity
Editorial brutalism: oversized raw type, exposed grid, one acid accent, print-magazine confidence.

## Colors
- background: `#0A0A0B`  surface: `#131316`
- text: `#F2F0EA`  muted: `#8A8A93`
- accent: `#C8FF3D` — max once per viewport (one link, one word, one underline)
- Never pure black `#000`, never pure white `#FFF`.

## Typography
- Display: Neue Montreal 400, `clamp(3.5rem, 10vw, 9rem)`, tight line-height 0.95, uppercase only for labels
- Body: Inter 400 18px/1.6, max measure 60ch
- Headlines never exceed 2 lines. Never center display type.

## Layout
- Max width 1440px. Sections separated by 120px whitespace or a 1px hairline rule.
- Asymmetric splits (7/5). Max 2 elements per row. No cards with borders.

## Signature elements
1. One marquee strip per page (accent text on dark, infinite loop)
2. Oversized outlined numerals (`-webkit-text-stroke`) as section decoration
3. Images scale to 1.05 with 0.8s expo ease on hover
4. Hover states: accent underline sweeps left-to-right

## Motion language
- Entrances: fade + translateY(40px), 0.8s, cubic-bezier(0.16,1,0.3,1)
- Stagger: 80ms between children
- Scroll: one pinned section with scrubbed timeline per page
- Micro: magnetic buttons (strength 0.35), nav links underline sweep

## FORBIDDEN
- ❌ gradient buttons / hero gradients  ❌ drop shadows  ❌ rounded cards
- ❌ centered hero + subtitle + 2 buttons + 3 feature cards
- ❌ emoji icons  ❌ glassmorphism  ❌ "Welcome to our website"
