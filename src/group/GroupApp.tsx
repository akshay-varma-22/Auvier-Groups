import { MotionConfig } from "motion/react";
import { companies, group } from "../brand";
import { GarmentDefs } from "../clothing/Garments";
import { Nav } from "../components/Nav";
import { Cursor } from "../components/ui/Cursor";
import { Logo } from "../components/ui/Logo";
import { routes } from "../lib/routes";
import { useSmoothSite } from "../lib/useSite";
import { navLinks } from "./content";
import { About, Companies, Contact, GroupFooter, GroupHero, Principles } from "./Sections";

export default function GroupApp() {
  useSmoothSite();
  return (
    <MotionConfig reducedMotion="user">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <GarmentDefs />
      <Cursor />
      <Nav
        brand={<Logo sub="Groups" dot="solid" />}
        brandLabel={group.name}
        links={navLinks}
        cta={{ label: "Contact us", href: "#contact" }}
        menuExtras={[
          { label: companies.technologies.name, href: routes.technologies },
          { label: companies.clothing.name, href: routes.clothing },
        ]}
      />
      <main id="main">
        <GroupHero />
        <About />
        <Companies />
        <Principles />
        <Contact />
      </main>
      <GroupFooter />
    </MotionConfig>
  );
}
