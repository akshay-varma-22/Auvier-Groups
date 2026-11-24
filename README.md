# Auvier Groups — website

The website for **Auvier Groups** and its two companies:

| Page | URL | What it is |
| --- | --- | --- |
| Auvier Groups | `/` | The parent company: introduces the group and both companies |
| Auvier Technologies | `/technologies/` | Web design, development & deployment studio — portfolio and project brief |
| Auvier Clothing | `/clothing/` | Premium everyday wear — Collection 01 preview and early-access list |

Built with Vite (multi-page), React 19, TypeScript and [Motion](https://motion.dev) for animation.
No CSS framework — the shared design system lives in `src/styles/tokens.css`.

**Smoothness rules:** scrolling is the browser's own (native) scrolling, which runs off the main
thread; heavy work (the 3D studio, textures, garment photos) runs in Web Workers; the 3D studio
only draws while something changes; and there are no live blur effects (`backdrop-filter`,
animated `filter: blur`), which are redrawn every frame. Keep to these when adding features.

## Run it

```bash
npm install
npm run dev       # http://localhost:5173  (also /technologies/ and /clothing/)
npm run build     # production build in dist/
npm run preview   # serve the production build locally
```

## Where things live

| | Copy | Components | Styles |
| --- | --- | --- | --- |
| Shared (all pages) | `src/brand.ts` — group name, email, company names & status | `src/components/ui/`, `src/components/Nav.tsx` | `tokens.css`, `base.css`, `ui.css` |
| Auvier Groups | `src/group/content.ts` | `src/group/` | `group.css` |
| Auvier Technologies | `src/content.ts` | `src/components/`, `src/TechnologiesApp.tsx` | `hero.css`, `work.css`, `sections.css`, `contact.css` |
| Auvier Clothing | `src/clothing/content.ts` | `src/clothing/` | `clothing.css` |

Each company has its own colour: brass for the group, Ember for Technologies, Loden green for
Clothing. They share the Auvier mark, but each company's dot means something different: a brass
seal, a live "online" dot, or a two-hole button.

Wrap words in `*asterisks*` in any content file to render them in the italic serif accent.

## Auvier Technologies portfolio

Projects come in two kinds, set by `kind` in `src/content.ts`:

- **Client work** (`kind: "client"`): real screenshots, a "Live site" badge and a link to the site.
  Screenshots live in `src/assets/work/`: `<id>-desktop.webp` (1800×1125), `<id>-mobile.webp`
  (780×1688) and four page sections `<id>-1…4.webp` for the case-study gallery.
- **Concept builds** (`kind: "concept"`): shown in the "Concept lab", using the hand-coded mockups
  in `src/components/work/Mockups.tsx`.

## Auvier Clothing

Collection 01 is shown as a **first look**: no prices or "buy" buttons. Piece names, fabrics,
fits and colours in `src/clothing/content.ts` are working placeholders. Update them as samples are
finalised.

The page opens with a **3D story you scroll through** (`src/clothing/story/`). It's one
continuous camera move through a studio, built with three.js, with captions choreographed in
Framer Motion (`motion`):

1. **Thread**: spools of yarn; one thread pays out across the studio.
2. **Weave**: a loom weaves cloth row by row (real over-and-under yarn, shuttle and beater).
3. **Cloth**: the finished fabric hangs on a brass rail, moving in a breeze (a cloth simulation).
4. **Cut & sew**: the tee's sleeves join the body and the seams are sewn in tone-on-tone
   twin-needle stitching, needle and all. The tee is a real soft garment: ribbed neckband,
   woven label inside the back neck, turned-up hems, seams and gentle wrinkles.
5. **Fold**: the tee lifts and folds itself into a retail fold with soft, rounded folds.
6. **Ready**: it lands on a stack of tees folded the same way, a paper band slips on, and the
   waitlist appears.

- `timeline.ts`: when each scene and caption happens, and the caption copy.
- `World.ts`: the 3D studio (sets, camera path, lighting).
- `tee.ts` / `teePattern.ts`: the tee — pattern pieces, its textures (relief, stitching, label),
  the sewing and the folds.
- `world.worker.ts`: runs the whole studio in a Web Worker on an OffscreenCanvas, so its
  build work and GPU shader compiles never block scrolling. `Story3D.tsx` falls back to running
  it on the page in browsers that can't do this. The tee textures (`tee.worker.ts`) and the
  garment photos (`fabric/photo.worker.ts`) are made in workers too.
- `textures.ts`: every texture, drawn procedurally (no image downloads).
- `Story3D.tsx`: the sticky canvas, captions, chapter rail, loading veil and no-WebGL fallback.

three.js loads as its own chunk after the page, and the studio builds itself scene by scene in
the background, lowering its resolution if a GPU can't keep up. Reduced-motion visitors get the
same story with no idle animation.

Below the story: the clothing rail and colourway cards (`Rail.tsx`, `Sections.tsx`), the fabric
swatches and the early-access form.

Garments on the rail, the cards and the group page are **photographic renders** made in the
browser (`src/clothing/fabric/`): each garment's construction (plies, collars, plackets, pockets,
seams, topstitching, ribbing, folds) is built as a height field and lit like a soft window light
in a Web Worker. `specs.ts` describes each garment, `photo.ts` renders it. The SVG flats in
`Garments.tsx` show instantly while the render is made and are the fallback for old browsers.
When product photography is ready, replace `<Garment>` with an `<img>`.

## Forms

There's no backend yet. The Technologies project brief and the Clothing waitlist both open the
visitor's email app with everything filled in, addressed to hello@auviergroups.com
(`src/lib/mail.ts`). To receive submissions directly, point them at a form service (Formspree,
Netlify Forms, etc.).

## Deploy

It's a static site, and all paths are relative, so it works at a domain root or in a subfolder:

- **Vercel / Netlify / Cloudflare Pages:** build command `npm run build`, output directory `dist`.
- **cPanel / any web host:** upload the contents of `dist/` (keep the `technologies/` and
  `clothing/` folders).

## Design system at a glance

| Layer | Choice |
| --- | --- |
| Colour | OKLCH tokens: violet-tinted ink, warm bone paper, plus one hue per company |
| Display type | Bricolage Grotesque (group & Technologies), Instrument Serif (Clothing) |
| Accent type | Instrument Serif Italic |
| Body / UI | Geist |
| Labels / code | Geist Mono |
| Motion | Expo-out easing, mask reveals, springs; respects `prefers-reduced-motion` |
