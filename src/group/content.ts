/* ==========================================================================
   Auvier Groups — parent company page copy.
   Every figure here is a plain fact about the group today; update them as
   the companies grow.
   ========================================================================== */

import { projects } from "../content";

export const navLinks = [
  { label: "About", href: "#about" },
  { label: "Companies", href: "#companies" },
  { label: "Principles", href: "#principles" },
  { label: "Contact", href: "#contact" },
];

export const hero = {
  eyebrow: "The parent company",
  title: "Two companies. *One standard of craft.*",
  lede: "Auvier Groups is the parent company of Auvier Technologies — a web design, development and deployment studio — and Auvier Clothing, a premium everyday-wear label. Different industries, the same obsession with doing things properly.",
};

const clientCount = projects.filter((p) => p.kind === "client").length;

export const about = {
  statement:
    "Auvier Groups builds and backs focused businesses we're proud to put our name on. Each company has its *own* team, customers and craft — and shares *one* way of working: design-led, honest, and built for the long run.",
  stats: [
    { value: "02", label: "Companies in the group" },
    { value: String(clientCount).padStart(2, "0"), label: "Client websites launched by Auvier Technologies" },
    { value: "01", label: "Clothing collection in development" },
  ],
};

export const profiles = {
  technologies: {
    body: "A web design, development and deployment studio. One team takes every project from first sketch to a fast, accessible website that's live on the internet — and looks after it afterwards.",
    offers: ["Brand-led web design", "Custom development", "Deployment & hosting", "Care & growth"],
    clients: projects.filter((p) => p.kind === "client").map((p) => p.name),
  },
  clothing: {
    body: "A premium everyday-wear label. Essentials in natural fabrics, easy fits and quiet colours — designed to be worn daily and kept for years. Collection 01 is in development.",
    offers: ["Tees & polos", "Overshirts", "Trousers", "Knitwear"],
  },
};

export const principles = [
  {
    title: "Design at the core",
    body: "Whether it's a website or a shirt, every decision starts with how it looks, feels and works for the person using it.",
  },
  {
    title: "Made to last",
    body: "We'd rather make fewer things properly than many things quickly — code that's maintainable, clothes that wear in.",
  },
  {
    title: "Close to customers",
    body: "Small teams and direct conversations. You talk to the people doing the work, not a chain of middlemen.",
  },
  {
    title: "Grow with intent",
    body: "Each company grows at its own pace, backed by the group — and never by cutting corners.",
  },
];

export const contact = {
  title: "Talk to *Auvier Groups.*",
  lede: "For partnerships, press or general enquiries, write to the group. For a website project or Auvier Clothing, go straight to the right team.",
};
