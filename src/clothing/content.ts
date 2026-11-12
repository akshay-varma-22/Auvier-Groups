/* ==========================================================================
   Auvier Clothing — page copy.

   Collection 01 is still in development, so pieces are presented as a first
   look: no prices, no "buy" buttons. Names, fabrics, fits and colourways
   below are working placeholders — update them as samples are finalised.
   ========================================================================== */

import type { GarmentKind } from "./Garments";

export const navLinks = [
  { label: "The story", href: "#story" },
  { label: "Collection", href: "#collection" },
  { label: "Fabrics", href: "#fabrics" },
];

/** Opening title of the 3D story. Chapter captions live in story/timeline.ts. */
export const storyHero = {
  eyebrow: "Auvier Clothing · Collection 01",
  title: "Woven slowly. *Worn daily.*",
  lede: "Premium everyday essentials, made with care at every step. Scroll to watch our first collection come together — from a single thread to a folded tee.",
};

export const ticker = ["Collection 01", "Coming soon", "Natural fabrics", "Easy fits", "Quiet colours", "Made to last"];

export type Colourway = { name: string; hex: string };

export type Piece = {
  id: string;
  kind: GarmentKind;
  name: string;
  fabric: string;
  fit: string;
  colours: Colourway[];
};

export const collection = {
  label: "Collection 01",
  title: "The *Essentials.*",
  note: "A first look at pieces in development. Final fabrics, colours and details may change before launch.",
  pieces: [
    {
      id: "tee",
      kind: "tee",
      name: "The Heavyweight Tee",
      fabric: "Dense cotton jersey",
      fit: "Relaxed, dropped shoulder",
      colours: [
        { name: "Ecru", hex: "#ebe3d3" },
        { name: "Charcoal", hex: "#3b3936" },
        { name: "Loden", hex: "#5d6648" },
      ],
    },
    {
      id: "overshirt",
      kind: "overshirt",
      name: "The Everyday Overshirt",
      fabric: "Brushed cotton twill",
      fit: "Boxy, made to layer",
      colours: [
        { name: "Stone", hex: "#c9bda6" },
        { name: "Navy", hex: "#2d3544" },
        { name: "Clay", hex: "#a8704f" },
      ],
    },
    {
      id: "trouser",
      kind: "trouser",
      name: "The Pleated Trouser",
      fabric: "Soft cotton twill",
      fit: "Relaxed, tapered leg",
      colours: [
        { name: "Taupe", hex: "#9c8c78" },
        { name: "Black", hex: "#252422" },
        { name: "Olive", hex: "#656b4d" },
      ],
    },
    {
      id: "polo",
      kind: "polo",
      name: "The Knit Polo",
      fabric: "Fine-gauge cotton knit",
      fit: "Regular, soft collar",
      colours: [
        { name: "Oat", hex: "#dccfb6" },
        { name: "Ink", hex: "#252b37" },
        { name: "Rust", hex: "#9b5839" },
      ],
    },
  ] satisfies Piece[],
};

/** What hangs on the rail at the top of the collection. */
export const rail: { kind: GarmentKind; name: string; colour: string; hex: string }[] = [
  { kind: "tee", name: "Heavyweight Tee", colour: "Ecru", hex: "#ebe3d3" },
  { kind: "overshirt", name: "Everyday Overshirt", colour: "Stone", hex: "#c9bda6" },
  { kind: "polo", name: "Knit Polo", colour: "Oat", hex: "#dccfb6" },
  { kind: "trouser", name: "Pleated Trouser", colour: "Taupe", hex: "#9c8c78" },
  { kind: "tee", name: "Heavyweight Tee", colour: "Loden", hex: "#5d6648" },
  { kind: "overshirt", name: "Everyday Overshirt", colour: "Navy", hex: "#2d3544" },
  { kind: "polo", name: "Knit Polo", colour: "Rust", hex: "#9b5839" },
  { kind: "trouser", name: "Pleated Trouser", colour: "Olive", hex: "#656b4d" },
  { kind: "tee", name: "Heavyweight Tee", colour: "Charcoal", hex: "#3b3936" },
  { kind: "overshirt", name: "Everyday Overshirt", colour: "Clay", hex: "#a8704f" },
];

export const fabrics = {
  title: "Fabric *first.*",
  lede: "The cloths we're building the range around — chosen for how they feel on day one and how they age after a hundred wears.",
  items: [
    {
      name: "Cotton jersey",
      use: "Tees",
      body: "A soft, breathable knit that holds its shape and only gets better with every wash.",
      texture: "jersey",
    },
    {
      name: "Cotton twill",
      use: "Overshirts & trousers",
      body: "A sturdy diagonal weave with a gentle drape — made to be worn in, not worn out.",
      texture: "twill",
    },
    {
      name: "Oxford cloth",
      use: "Shirts",
      body: "A classic basket weave with a textured hand — smart enough for work, easy enough for weekends.",
      texture: "oxford",
    },
    {
      name: "Linen",
      use: "Warm-weather pieces",
      body: "Naturally cool and quick to dry, with the relaxed slub that makes linen look lived-in.",
      texture: "linen",
    },
  ] as const,
};

export const notify = {
  title: "Be first *in line.*",
  lede: "Join the list for early access to Collection 01, launch-day news and the occasional behind-the-scenes look. We'll only email when there's something worth saying.",
  interests: ["Tees", "Overshirts", "Trousers", "Knitwear"],
  sizes: ["XS", "S", "M", "L", "XL", "XXL"],
};
