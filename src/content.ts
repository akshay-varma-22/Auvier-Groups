/* ==========================================================================
   Auvier Technologies — all page copy lives here so it can be edited without
   touching components. Text wrapped in *asterisks* renders as the italic
   serif accent.

   Projects come in two kinds: live client sites (shown with real screenshots
   from src/assets/work) and concept builds (hand-coded mockups). The cards and
   case-study overlay are driven entirely from this file.
   ========================================================================== */

import { companies, group } from "./brand";

export const site = {
  name: companies.technologies.name,
  short: "Auvier",
  email: group.email,
  year: group.year,
};

export const navLinks = [
  { label: "Work", href: "#work" },
  { label: "Services", href: "#services" },
  { label: "Process", href: "#process" },
  { label: "FAQ", href: "#faq" },
];

export const hero = {
  eyebrow: "Web design & development studio",
  stages: [
    { word: "Design", note: "Sketch to interface" },
    { word: "Develop", note: "Interface to code" },
    { word: "Deploy", note: "Code to live" },
  ],
  lede: "Auvier Technologies takes your idea from first sketch to a fast, beautiful website that's live on the internet — one team, start to finish.",
  availability: "Now booking new projects",
};

export const marquee = [
  "Brand websites",
  "Landing pages",
  "E-commerce",
  "Web apps",
  "Redesigns",
  "Motion & interaction",
  "SEO & performance",
  "Hosting & care",
];

export const statement =
  "Most websites are a template with a logo on top. We *design* every screen around how your customers think, *build* it in clean, modern code, and *launch* it on infrastructure that doesn't blink.";

export type MockupKind = "maren" | "kiln" | "quill" | "pulse";

export type Project = {
  id: string;
  kind: "client" | "concept";
  name: string;
  sector: string;
  type: string;
  summary: string;
  tags: string[];
  /** Panel colour behind the preview on the card */
  panel: string;
  /** Text colour on that panel */
  panelInk: string;
  /** Live site (client work) */
  url?: string;
  /** Screenshots in src/assets/work (client work) */
  shots?: { desktop: string; mobile: string; gallery: string[] };
  /** Hand-coded mockup (concept builds) */
  mockup?: MockupKind;
  /** The client's brief, or the problem a concept sets out to solve */
  challenge: string;
  approach: string;
  built: string[];
  stack?: string[];
};

// Imported (not served from /public) so URLs resolve correctly from any page depth.
const WORK = import.meta.glob<string>("./assets/work/*.webp", { eager: true, query: "?url", import: "default" });
const shot = (file: string) => WORK[`./assets/work/${file}.webp`];
const shotsFor = (id: string) => ({
  desktop: shot(`${id}-desktop`),
  mobile: shot(`${id}-mobile`),
  gallery: [1, 2, 3, 4].map((n) => shot(`${id}-${n}`)),
});

export const projects: Project[] = [
  {
    id: "white-elephant",
    kind: "client",
    name: "White Elephant",
    sector: "Interiors & architecture studio, Hyderabad",
    type: "Brand website · Lead generation",
    summary:
      "A warm, editorial website for an interiors, architecture and furniture studio — designed to turn visitors into quotation requests.",
    tags: ["Brand site", "Lead generation", "Responsive"],
    panel: "oklch(0.36 0.05 50)",
    panelInk: "oklch(0.94 0.025 80)",
    url: "https://www.whiteelephantcreativestudio.in/",
    shots: shotsFor("white-elephant"),
    challenge:
      "Present interiors, architecture and furniture as one considered offer — and make asking for a quotation the obvious next step on every page.",
    approach:
      "Warm photographic layouts and a classic serif voice, arched service cards, a filterable project gallery, and quotation and WhatsApp calls-to-action always within reach.",
    built: ["Filterable featured-work gallery", "Six-service overview", "Quotation & WhatsApp enquiry paths", "Process and contact sections"],
    stack: ["React", "Vite", "Netlify"],
  },
  {
    id: "rare-art",
    kind: "client",
    name: "The Rare Art",
    sector: "Curated art & collectibles house, Banjara Hills",
    type: "Brand experience · 3D",
    summary:
      "An immersive, gallery-like site for a house of sculpture, timepieces and collectible design — with an interactive 3D viewing room.",
    tags: ["Storytelling", "3D / WebGL", "Art direction"],
    panel: "oklch(0.8 0.008 90)",
    panelInk: "oklch(0.2 0.005 90)",
    url: "https://rare-art.vercel.app/first-sample",
    shots: shotsFor("rare-art"),
    challenge:
      "Introduce a new destination for rare objects, by Select Homes, with the quiet polish of a private gallery — and invite collectors to enquire or visit.",
    approach:
      "The story unfolds in six chapters: a single-line amphora motif, a scrolling collection, and a 3D viewing room where visitors turn a piece and try finishes before they enquire.",
    built: ["Chaptered scroll narrative", "Interactive 3D viewing room", "Six-chapter collection", "Private enquiry & showroom visit"],
    stack: ["React", "Vite", "three.js", "Vercel"],
  },
  {
    id: "artonym",
    kind: "client",
    name: "Artonym",
    sector: "Fine-arts technology company",
    type: "Company website",
    summary:
      "A calm, typographic company site for the team behind Art & Artist — mission, product, people and contact in one clear scroll.",
    tags: ["Company site", "Typography", "Minimal"],
    panel: "oklch(0.17 0 0)",
    panelInk: "oklch(0.97 0 0)",
    url: "https://www.artonym.in/",
    shots: shotsFor("artonym"),
    challenge:
      "Give the company building Art & Artist a credible, focused presence for galleries, institutions and future partners.",
    approach:
      "A restrained black-and-white system with large serif type, a product spotlight for Art & Artist, a rotating 'Built for…' headline, and clear team and contact sections.",
    built: ["Product spotlight", "Rotating audience headline", "Mission, vision & values", "Team & contact sections"],
    stack: ["React", "Vite"],
  },
  {
    id: "art-and-artist",
    kind: "client",
    name: "Art & Artist",
    sector: "Creative network for artists",
    type: "Launch site · Waitlist",
    summary:
      "An image-led launch site for a platform connecting painters, filmmakers, musicians and designers — building a founding-member waitlist.",
    tags: ["Launch", "Waitlist", "Motion"],
    panel: "oklch(0.48 0.1 38)",
    panelInk: "oklch(0.96 0.02 70)",
    url: "https://www.artandartist.co.in/",
    shots: shotsFor("art-and-artist"),
    challenge:
      "Explain a platform before it launches, make every kind of artist feel it was built for them, and collect sign-ups ahead of opening.",
    approach:
      "A floating collage of Indian art forms, a scroll-driven story from problem to vision, audience-by-audience sections and a sample feed — all leading to a ticket-style founding-member waitlist.",
    built: ["Floating art-form collage", "Scroll-driven brand story", "Audience & how-it-works sections", "Founding-member waitlist"],
    stack: ["React", "Vite"],
  },
  {
    id: "maren-vale",
    kind: "concept",
    name: "Maren Vale",
    sector: "Independent fragrance house",
    type: "E-commerce",
    summary:
      "A slow, sensory storefront for a small-batch perfumer — where every scroll feels like opening a bottle.",
    tags: ["Brand site", "Storefront", "Art direction"],
    panel: "oklch(0.3 0.045 162)",
    panelInk: "oklch(0.95 0.02 90)",
    mockup: "maren",
    challenge:
      "Fragrance is bought on feeling, yet most online shops reduce it to a grid of bottles and a price tag.",
    approach:
      "We led with scent stories: full-bleed editorial chapters, fragrance notes visualised as layered colour, and a checkout trimmed to three calm steps.",
    built: ["Editorial product storytelling", "Scent-note explorer", "Headless storefront & cart", "Gift-wrap & sampler flow"],
    stack: ["Next.js", "Shopify Storefront API", "Motion", "Vercel"],
  },
  {
    id: "kiln-society",
    kind: "concept",
    name: "Kiln Society",
    sector: "Ceramics studio & school",
    type: "Brand site · Booking",
    summary:
      "A warm, tactile home for a pottery studio — classes, commissions and a small-batch shop in one place.",
    tags: ["Booking", "CMS", "Illustration"],
    panel: "oklch(0.64 0.12 48)",
    panelInk: "oklch(0.2 0.03 40)",
    mockup: "kiln",
    challenge:
      "Classes were booked over DMs, the shop lived on a marketplace, and the website felt nothing like the studio.",
    approach:
      "Arched layouts, clay-toned colour and a booking flow with live class availability — built so the studio team can update every word and photo themselves.",
    built: ["Class booking with live spots", "Commission enquiry flow", "Shop with inventory sync", "Fully editable CMS"],
    stack: ["Astro", "Sanity CMS", "Stripe", "Netlify"],
  },
  {
    id: "quillstack",
    kind: "concept",
    name: "Quillstack",
    sector: "Documentation platform for dev teams",
    type: "SaaS · Product marketing",
    summary:
      "A crisp product site for a docs tool — interactive demos instead of screenshots, and pricing that explains itself.",
    tags: ["SaaS", "Design system", "Interactive demo"],
    panel: "oklch(0.9 0.035 275)",
    panelInk: "oklch(0.22 0.06 275)",
    mockup: "quill",
    challenge:
      "A powerful product explained with static screenshots and walls of text — visitors left before they understood it.",
    approach:
      "We rebuilt the story around live, in-browser product demos, a component-driven design system and a pricing page with a usage calculator.",
    built: ["In-browser product demos", "Component design system", "Pricing calculator", "Docs-style changelog"],
    stack: ["React", "TypeScript", "MDX", "Cloudflare Pages"],
  },
  {
    id: "pulsefield",
    kind: "concept",
    name: "Pulsefield",
    sector: "Strength & conditioning club",
    type: "Launch site · Memberships",
    summary:
      "A loud, kinetic launch site for a new gym — timetable, memberships and sign-up in under a minute on a phone.",
    tags: ["Launch", "Mobile-first", "Sign-up flow"],
    panel: "oklch(0.2 0.01 130)",
    panelInk: "oklch(0.93 0.19 125)",
    mockup: "pulse",
    challenge:
      "A brand-new gym needed founding members before the doors opened — with zero awareness and a tight launch window.",
    approach:
      "A bold, type-led identity, a scroll-driven class timetable and a membership sign-up designed thumb-first for phones.",
    built: ["Founding-member sign-up", "Live class timetable", "Coach profiles", "Waitlist & referral emails"],
    stack: ["Next.js", "Supabase", "Resend", "Vercel"],
  },
];

export const services = [
  {
    title: "Web Design",
    line: "Interfaces with a point of view.",
    body: "Strategy-led UX and visual design shaped around your brand and your customers — not a theme with your logo dropped in.",
    items: ["UX strategy & sitemaps", "Wireframes", "UI & visual design", "Design systems", "Clickable prototypes"],
  },
  {
    title: "Web Development",
    line: "Hand-built. Never templated.",
    body: "Fast, accessible, responsive builds in modern frameworks, with the motion and interaction that make a site feel alive.",
    items: ["React & Next.js", "CMS integration", "E-commerce", "Animation & interaction", "APIs & integrations"],
  },
  {
    title: "Deployment & Hosting",
    line: "Live, fast — and it stays that way.",
    body: "We launch on modern edge infrastructure with automated deploys, so updates ship in minutes and your site stays quick worldwide.",
    items: ["Domains, DNS & SSL", "CI/CD pipelines", "Edge hosting", "Analytics setup", "Uptime monitoring"],
  },
  {
    title: "Care & Growth",
    line: "Launch is day one.",
    body: "Ongoing updates, SEO and performance work so your website keeps earning its keep long after it goes live.",
    items: ["Maintenance plans", "Technical SEO", "Performance tuning", "Content updates", "Conversion improvements"],
  },
];

export const process = [
  {
    title: "Discover",
    when: "Week 1",
    body: "We dig into your business, your audience and what the website has to achieve — then turn it into a clear plan, sitemap and scope.",
    points: ["Goals & audience workshop", "Content & competitor audit", "Sitemap and fixed quote"],
  },
  {
    title: "Design",
    when: "Weeks 2–3",
    body: "Wireframes first, then full visual design. You see real screens early, give feedback in context, and approve before a line of code.",
    points: ["Wireframes & user flows", "High-fidelity UI", "Interactive prototype"],
  },
  {
    title: "Develop",
    when: "Weeks 3–6",
    body: "We hand-build every component, wire up your CMS and integrations, and test on real phones, tablets and browsers.",
    points: ["Responsive build", "CMS & integrations", "Accessibility & speed checks"],
  },
  {
    title: "Deploy",
    when: "Launch week",
    body: "We connect your domain, launch on fast global hosting, set up analytics, and hand over everything — with care plans if you want us to stay on.",
    points: ["Launch & DNS", "Analytics & monitoring", "Handover & training"],
  },
];

export const shipLog = [
  { label: "Design tokens synced", detail: "colour · type · space" },
  { label: "Components compiled", detail: "hero · nav · forms" },
  { label: "Images optimised", detail: "AVIF · WebP · lazy" },
  { label: "Accessibility audit", detail: "WCAG 2.2 AA" },
  { label: "SEO & social metadata", detail: "sitemap · OG · schema" },
  { label: "Deployed to the edge", detail: "SSL · CDN · cache" },
];

export const principles = [
  {
    title: "Custom, never templated",
    body: "Every layout is designed for your brand and your customers. No themes, no page builders, no lookalikes.",
    visual: "custom",
  },
  {
    title: "Fast by default",
    body: "Lean code, optimised images and modern hosting, so pages load quickly on any connection.",
    visual: "fast",
  },
  {
    title: "Built for everyone",
    body: "Accessible, responsive and tested on real devices — your site works for every visitor, on every screen.",
    visual: "access",
  },
  {
    title: "Yours to own",
    body: "When the project is done, the code, designs and accounts are yours. No lock-in, no hostage hosting.",
    visual: "own",
  },
] as const;

export const faqs = [
  {
    q: "How long does a website take?",
    a: "Most brand websites take around four to eight weeks from kickoff to launch. Larger builds like e-commerce or web apps take longer — you'll get a clear timeline before we start.",
  },
  {
    q: "How much does a website cost?",
    a: "Every project is scoped to your goals, so we don't sell one-size packages. Tell us what you need and we'll come back with a clear, fixed quote — no hourly surprises.",
  },
  {
    q: "Do you only design, or do you build it too?",
    a: "Both — and we deploy it. One team handles design, development and launch, so nothing gets lost passing work between agencies.",
  },
  {
    q: "Can I update the website myself?",
    a: "Yes. Where you need it we connect a friendly CMS, and we walk your team through it at handover so editing text, images and pages is easy.",
  },
  {
    q: "Who owns the website and the code?",
    a: "You do. Once the project is paid for, the code, design files and accounts are yours — no lock-in.",
  },
  {
    q: "Do you help after launch?",
    a: "Absolutely. We offer care plans covering hosting, updates, backups, performance and SEO — or we hand everything over cleanly to your team.",
  },
];

export const contact = {
  heading: "Let's build something *unforgettable.*",
  lede: "Tell us a little about your project. We reply to every enquiry, usually within one working day.",
  needs: ["New website", "Redesign", "E-commerce", "Web app", "Hosting & care", "Not sure yet"],
  timelines: ["As soon as possible", "1–2 months", "3+ months", "Flexible"],
};
