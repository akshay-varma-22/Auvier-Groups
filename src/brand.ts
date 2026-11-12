/* ==========================================================================
   Group-level facts shared by every page: the parent company and its
   subsidiaries. Page-specific copy lives in each company's content file.
   ========================================================================== */

export const group = {
  name: "Auvier Groups",
  short: "Auvier",
  email: "auviergroups@gmail.com",
  year: new Date().getFullYear(),
};

export type CompanyId = "technologies" | "clothing";

export const companies: Record<
  CompanyId,
  { name: string; label: string; sector: string; tagline: string; status: string }
> = {
  technologies: {
    name: "Auvier Technologies",
    label: "Technologies",
    sector: "Web design, development & deployment",
    tagline: "Websites designed, developed and deployed — by one team.",
    status: "Taking new projects",
  },
  clothing: {
    name: "Auvier Clothing",
    label: "Clothing",
    sector: "Premium everyday wear",
    tagline: "Premium essentials in natural fabrics and easy fits.",
    status: "Collection 01 — coming soon",
  },
};
