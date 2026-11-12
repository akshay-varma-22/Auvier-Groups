import type { ReactNode } from "react";
import type { MockupKind } from "../../content";

/* Hand-built miniature websites for each concept project. They are pure
   HTML/CSS/SVG sized in em against a container-query font size, so they stay
   razor sharp at any size — no screenshots required. */

export function BrowserFrame({ url, children }: { url: string; children: ReactNode }) {
  return (
    <div className="frame">
      <div className="frame__bar" aria-hidden="true">
        <span className="frame__dots">
          <i />
          <i />
          <i />
        </span>
        <span className="frame__url">{url}</span>
        <span className="frame__spacer" />
      </div>
      <div className="frame__screen">{children}</div>
    </div>
  );
}

export function PhoneFrame({ children }: { children: ReactNode }) {
  return <div className="phone">{children}</div>;
}

export function Mockup({ kind }: { kind: MockupKind }) {
  switch (kind) {
    case "maren":
      return <Maren />;
    case "kiln":
      return <Kiln />;
    case "quill":
      return <Quill />;
    case "pulse":
      return <Pulse />;
  }
}

function Maren() {
  return (
    <div className="mk mk-maren" aria-hidden="true">
      <div className="mk-maren__nav">
        <span>Shop</span>
        <span>Stories</span>
        <span className="mk-maren__brand">Maren&nbsp;Vale</span>
        <span>Journal</span>
        <span>Bag (2)</span>
      </div>
      <div className="mk-maren__hero">
        <div className="mk-maren__copy">
          <span className="mk-maren__kicker">Nº 07 — Salt Fig</span>
          <span className="mk-maren__title">
            Rain on <i>warm stone.</i>
          </span>
          <span className="mk-maren__text">
            Green fig, sea salt and cedar, blended by hand in batches of two hundred.
          </span>
          <span className="mk-maren__btns">
            <span className="mk-maren__btn">Add to bag — 50 ml</span>
            <span className="mk-maren__link">Discover the notes</span>
          </span>
        </div>
        <div className="mk-maren__stage">
          <span className="mk-maren__sun" />
          <span className="mk-maren__bottle">
            <span className="mk-maren__cap" />
            <span className="mk-maren__neck" />
            <span className="mk-maren__glass">
              <span className="mk-maren__liquid" />
              <span className="mk-maren__label">
                <b>MV</b>
                Nº 07
              </span>
            </span>
          </span>
        </div>
      </div>
      <div className="mk-maren__notes">
        <span>
          <i style={{ background: "oklch(0.83 0.12 95)" }} />
          Top · Bergamot
        </span>
        <span>
          <i style={{ background: "oklch(0.7 0.12 140)" }} />
          Heart · Fig leaf
        </span>
        <span>
          <i style={{ background: "oklch(0.75 0.05 230)" }} />
          Base · Sea salt
        </span>
      </div>
    </div>
  );
}

function Vessel({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 100 120" className="mk-kiln__vessel">
      <path d={d} fill="currentColor" />
    </svg>
  );
}

function Kiln() {
  return (
    <div className="mk mk-kiln" aria-hidden="true">
      <div className="mk-kiln__nav">
        <span className="mk-kiln__brand">
          <i />
          Kiln Society
        </span>
        <span className="mk-kiln__links">
          <span>Classes</span>
          <span>Commissions</span>
          <span>Shop</span>
        </span>
        <span className="mk-kiln__pill">Book a class</span>
      </div>
      <div className="mk-kiln__body">
        <div className="mk-kiln__copy">
          <span className="mk-kiln__title">
            Made by <i>hand,</i> fired with care.
          </span>
          <span className="mk-kiln__text">Wheel, hand-building and glaze classes for every level.</span>
          <span className="mk-kiln__card">
            <span className="mk-kiln__card-k">Sat · 10:00</span>
            <span className="mk-kiln__card-t">Wheel Throwing 101</span>
            <span className="mk-kiln__card-row">
              <span className="mk-kiln__spots">
                <i className="on" />
                <i className="on" />
                <i className="on" />
                <i />
                <i />
                3 spots left
              </span>
              <span className="mk-kiln__book">Book</span>
            </span>
          </span>
        </div>
        <div className="mk-kiln__arches">
          <span className="mk-kiln__arch">
            <Vessel d="M38 12h24v8c0 6 14 14 14 38 0 30-14 50-26 50S24 88 24 58c0-24 14-32 14-38z" />
          </span>
          <span className="mk-kiln__arch mk-kiln__arch--tall">
            <Vessel d="M30 30c0-8 8-12 20-12s20 4 20 12-10 10-10 18c0 10 22 18 22 40 0 16-14 24-32 24S18 104 18 88c0-22 22-30 22-40 0-8-10-10-10-18z" />
          </span>
          <span className="mk-kiln__arch">
            <Vessel d="M14 50h72c0 30-16 56-36 56S14 80 14 50z" />
          </span>
        </div>
      </div>
    </div>
  );
}

function Quill() {
  return (
    <div className="mk mk-quill" aria-hidden="true">
      <div className="mk-quill__nav">
        <span className="mk-quill__brand">
          <i />
          Quillstack
        </span>
        <span className="mk-quill__links">
          <span>Product</span>
          <span>Docs</span>
          <span>Pricing</span>
          <span>Changelog</span>
        </span>
        <span className="mk-quill__cta">Start free</span>
      </div>
      <div className="mk-quill__hero">
        <span className="mk-quill__badge">New · AI search is here</span>
        <span className="mk-quill__title">
          Docs your team <i>actually</i> reads.
        </span>
        <span className="mk-quill__text">Write, version and ship documentation where your code already lives.</span>
      </div>
      <div className="mk-quill__app">
        <div className="mk-quill__side">
          <span className="mk-quill__side-h" />
          {[64, 80, 52, 72, 58, 76].map((w, i) => (
            <span key={i} className={i === 1 ? "mk-quill__side-i is-on" : "mk-quill__side-i"} style={{ width: `${w}%` }} />
          ))}
        </div>
        <div className="mk-quill__doc">
          <span className="mk-quill__doc-h">Getting started</span>
          <span className="mk-quill__doc-l" style={{ width: "92%" }} />
          <span className="mk-quill__doc-l" style={{ width: "78%" }} />
          <span className="mk-quill__codeblock">
            <span>
              <b>$</b> npx quill init
            </span>
            <span className="dim">✓ Workspace ready</span>
          </span>
          <span className="mk-quill__doc-l" style={{ width: "85%" }} />
        </div>
        <div className="mk-quill__palette">
          <span className="mk-quill__search">
            <i /> Search docs… <kbd>⌘K</kbd>
          </span>
          <span className="mk-quill__result is-on">Authentication</span>
          <span className="mk-quill__result">Deploy previews</span>
          <span className="mk-quill__result">Webhooks</span>
        </div>
      </div>
    </div>
  );
}

function Pulse() {
  const rows = [
    ["06:00", "Strength", "Coach Ari"],
    ["07:30", "Conditioning", "Coach Mei"],
    ["12:15", "Olympic lifting", "Coach Sam"],
  ];
  return (
    <div className="mk mk-pulse" aria-hidden="true">
      <div className="mk-pulse__nav">
        <span className="mk-pulse__brand">PULSEFIELD</span>
        <span className="mk-pulse__links">
          <span>Timetable</span>
          <span>Coaches</span>
          <span>Membership</span>
        </span>
        <span className="mk-pulse__cta">Join now</span>
      </div>
      <div className="mk-pulse__body">
        <div className="mk-pulse__copy">
          <span className="mk-pulse__kicker">Founding members · Opening soon</span>
          <span className="mk-pulse__title">
            Move
            <br />
            <span className="mk-pulse__outline">heavy.</span>
          </span>
          <span className="mk-pulse__join">Claim your spot →</span>
        </div>
        <div className="mk-pulse__side">
          <span className="mk-pulse__ring">
            <svg viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" className="track" />
              <circle cx="50" cy="50" r="40" className="bar" pathLength="100" strokeDasharray="86 100" />
            </svg>
            <span className="mk-pulse__ring-v">
              86<small>%</small>
              <em>spots claimed</em>
            </span>
          </span>
          <span className="mk-pulse__table">
            {rows.map(([t, c, coach]) => (
              <span key={t} className="mk-pulse__row">
                <b>{t}</b>
                <span>{c}</span>
                <span className="dim">{coach}</span>
              </span>
            ))}
          </span>
        </div>
      </div>
    </div>
  );
}
