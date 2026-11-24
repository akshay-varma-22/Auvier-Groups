import { AnimatePresence, MotionConfig } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { companies } from "./brand";
import { Nav } from "./components/Nav";
import { Hero } from "./components/hero/Hero";
import { LocalOffer } from "./components/sections/LocalOffer";
import { Contact } from "./components/sections/Contact";
import { FAQ } from "./components/sections/FAQ";
import { Footer } from "./components/sections/Footer";
import { Marquee } from "./components/sections/Marquee";
import { Principles } from "./components/sections/Principles";
import { Process } from "./components/sections/Process";
import { Services } from "./components/sections/Services";
import { Ship } from "./components/sections/Ship";
import { Statement } from "./components/sections/Statement";
import { Assistant } from "./components/ui/Assistant";
import { Cursor } from "./components/ui/Cursor";
import { GroupBar } from "./components/ui/GroupBar";
import { Logo } from "./components/ui/Logo";
import { Preloader } from "./components/ui/Preloader";
import { Work } from "./components/work/Work";
import { navLinks } from "./content";
import { IntroContext } from "./lib/intro";
import { routes } from "./lib/routes";
import { lockScroll } from "./lib/scroll";
import { useSmoothSite } from "./lib/useSite";

const SEEN_KEY = "auvier:intro-seen";

/** The preloader plays once per browser session, never for reduced motion. */
function shouldShowIntro() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  try {
    return sessionStorage.getItem(SEEN_KEY) !== "1";
  } catch {
    return true;
  }
}

export default function TechnologiesApp() {
  const [loading, setLoading] = useState(shouldShowIntro);
  const [ready, setReady] = useState(!loading);
  useSmoothSite();

  const finishIntro = useCallback(() => {
    try {
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* storage unavailable: intro simply plays again next time */
    }
    setLoading(false);
    window.setTimeout(() => setReady(true), 350);
  }, []);

  useEffect(() => {
    lockScroll(loading);
  }, [loading]);

  return (
    <MotionConfig reducedMotion="user">
      <IntroContext.Provider value={ready}>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <AnimatePresence>{loading && <Preloader key="preloader" onDone={finishIntro} />}</AnimatePresence>
        <Cursor />
        <GroupBar current="technologies" />
        <Nav
          brand={<Logo sub="Technologies" dot="live" />}
          brandLabel={companies.technologies.name}
          links={navLinks}
          cta={{ label: "Start a project", href: "#contact" }}
          menuExtras={[
            { label: "Auvier Groups", href: routes.group },
            { label: companies.clothing.name, href: routes.clothing },
          ]}
        />
        <main id="main">
          <Hero />
          <Marquee />
          <Statement />
          <Work />
          <Services />
          <LocalOffer />
          <Process />
          <Ship />
          <Principles />
          <FAQ />
          <Contact />
        </main>
        <Footer />
        <Assistant />
      </IntroContext.Provider>
    </MotionConfig>
  );
}
