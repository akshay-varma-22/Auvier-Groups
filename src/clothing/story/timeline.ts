/* The story is one long scroll. Every scene and caption reads its moment from
   this shared timeline, so the 3D world and the text never drift apart. */

export const T = {
  intro: [0.0, 0.06],
  thread: [0.06, 0.16],
  toLoom: [0.16, 0.21],
  weave: [0.21, 0.42],
  toCloth: [0.42, 0.47],
  cloth: [0.47, 0.57],
  toTable: [0.57, 0.62],
  sew: [0.62, 0.75],
  fold: [0.75, 0.9],
  ready: [0.9, 1.0],
} as const;

export type Segment = keyof typeof T;

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Local 0–1 progress through one segment. */
export const seg = (p: number, s: Segment) => clamp01((p - T[s][0]) / (T[s][1] - T[s][0]));

/** Local 0–1 progress through a sub-range of a 0–1 value. */
export const sub = (v: number, a: number, b: number) => clamp01((v - a) / (b - a));

export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

export type Chapter = {
  id: string;
  n: string;
  label: string;
  /** When the caption is on screen (story progress 0–1). */
  range: [number, number];
  title: string;
  body: string;
};

export const CHAPTERS: Chapter[] = [
  {
    id: "thread",
    n: "01",
    label: "Thread",
    range: [0.065, 0.2],
    title: "It starts with a single *thread.*",
    body: "Every piece begins as fibre — chosen for how it will feel on day one, and a thousand wears later.",
  },
  {
    id: "weave",
    n: "02",
    label: "Weave",
    range: [0.22, 0.42],
    title: "Woven, row by *row.*",
    body: "Thousands of crossings, over and under, until loose thread becomes cloth with a hand you can feel.",
  },
  {
    id: "cloth",
    n: "03",
    label: "Cloth",
    range: [0.47, 0.58],
    title: "Cloth with *character.*",
    body: "Brushed, washed and left to fall the way good fabric should — soft, weighty, alive.",
  },
  {
    id: "sew",
    n: "04",
    label: "Cut & sew",
    range: [0.62, 0.75],
    title: "Cut and sewn with *care.*",
    body: "Clean seams, sturdy stitching and the small details you'll notice the first time you put it on.",
  },
  {
    id: "fold",
    n: "05",
    label: "Fold",
    range: [0.76, 0.9],
    title: "Finished to *perfection.*",
    body: "Pressed, folded and finished — the last thing we touch before it's yours.",
  },
  {
    id: "ready",
    n: "06",
    label: "Ready",
    range: [0.91, 1.0],
    title: "Collection 01. *Coming soon.*",
    body: "Our first pieces are almost ready. Join the list to be first in line when they launch.",
  },
];
