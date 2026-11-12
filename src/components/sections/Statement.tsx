import { statement } from "../../content";
import { Eyebrow } from "../ui/Eyebrow";
import { ScrollWords } from "../ui/ScrollWords";

/** A manifesto that "writes itself" as you scroll through it. */
export function Statement() {
  return (
    <section id="intro" className="section statement">
      <div className="container statement__grid">
        <Eyebrow index="01">The studio</Eyebrow>
        <ScrollWords text={statement} className="statement__text" />
        <div className="statement__meta">
          <div>
            <span className="statement__k">What we do</span>
            <span className="statement__v">Design, development &amp; deployment</span>
          </div>
          <div>
            <span className="statement__k">Who it's for</span>
            <span className="statement__v">Brands, start-ups &amp; growing businesses</span>
          </div>
          <div>
            <span className="statement__k">How we work</span>
            <span className="statement__v">One team, from first call to launch day</span>
          </div>
        </div>
      </div>
    </section>
  );
}
