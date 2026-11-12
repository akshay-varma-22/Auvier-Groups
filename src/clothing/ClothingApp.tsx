import { AnimatePresence, MotionConfig } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { companies } from "../brand";
import { Nav } from "../components/Nav";
import { Cursor } from "../components/ui/Cursor";
import { GroupBar } from "../components/ui/GroupBar";
import { IntroContext } from "../lib/intro";
import { routes } from "../lib/routes";
import { lockScroll } from "../lib/scroll";
import { useSmoothSite } from "../lib/useSite";
import { navLinks } from "./content";
import { GarmentDefs } from "./Garments";
import { ClothingLogo } from "./Hero";
import { StitchIntro } from "./Intro";
import { ClothingFooter, Collection, Fabrics, Notify, Ticker } from "./Sections";
import { Story3D } from "./story/Story3D";

const SEEN_KEY = "auvier:clothing-intro-seen";

/** The stitched-label intro plays once per session, never for reduced motion. */
function shouldShowIntro() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  try {
    return sessionStorage.getItem(SEEN_KEY) !== "1";
  } catch {
    return true;
  }
}

export default function ClothingApp() {
  const [intro, setIntro] = useState(shouldShowIntro);
  const [ready, setReady] = useState(!intro);
  useSmoothSite();

  const finishIntro = useCallback(() => {
    try {
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* storage unavailable: the intro simply plays again next time */
    }
    setIntro(false);
    window.setTimeout(() => setReady(true), 300);
  }, []);

  useEffect(() => {
    lockScroll(intro);
  }, [intro]);

  return (
    <MotionConfig reducedMotion="user">
      <IntroContext.Provider value={ready}>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <GarmentDefs />
        <AnimatePresence>{intro && <StitchIntro key="intro" onDone={finishIntro} />}</AnimatePresence>
        <Cursor />
        <GroupBar current="clothing" />
        <Nav
          layout="centered"
          brand={<ClothingLogo />}
          brandLabel={companies.clothing.name}
          links={navLinks}
          cta={{ label: "Notify me", href: "#notify" }}
          menuExtras={[
            { label: "Auvier Groups", href: routes.group },
            { label: companies.technologies.name, href: routes.technologies },
          ]}
        />
        <main id="main">
          <Story3D />
          <Collection />
          <Fabrics />
          <Notify />
          <Ticker />
        </main>
        <ClothingFooter />
      </IntroContext.Provider>
    </MotionConfig>
  );
}
