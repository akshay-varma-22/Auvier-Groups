import { AnimatePresence, motion } from "motion/react";
import { useState, type FormEvent } from "react";
import { contact, site } from "../../content";
import { EASE_OUT } from "../../lib/intro";
import { Button } from "../ui/Button";
import { Eyebrow } from "../ui/Eyebrow";
import { SplitText } from "../ui/SplitText";

/**
 * Project brief form. With no backend yet, submitting composes a tidy email
 * in the visitor's mail app. To collect briefs directly instead, point the
 * form at a service such as Formspree or Netlify Forms.
 */
export function Contact() {
  const [needs, setNeeds] = useState<string[]>([]);
  const [timeline, setTimeline] = useState("");
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(false);

  const toggleNeed = (n: string) => setNeeds((cur) => (cur.includes(n) ? cur.filter((x) => x !== n) : [...cur, n]));

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(site.email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      window.location.href = `mailto:${site.email}`;
    }
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const phone = String(data.get("phone") ?? "").trim();
    const company = String(data.get("company") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();

    const details = [
      `Name: ${name}`,
      `Email: ${email}`,
      `Mobile: ${phone}`,
      company && `Company / website: ${company}`,
      needs.length > 0 && `Looking for: ${needs.join(", ")}`,
      timeline && `Timeline: ${timeline}`,
    ].filter(Boolean);
    const body = `${details.join("\n")}\n\n${message}`;

    const subject = `New project enquiry — ${name || "website"}`;
    window.location.href = `mailto:${site.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setSent(true);
  };

  return (
    <section id="contact" className="section section--sheet theme-ember contact" aria-labelledby="contact-title">
      <div className="container contact__grid">
        <div className="contact__copy">
          <Eyebrow index="08">Start a project</Eyebrow>
          <SplitText as="h2" id="contact-title" className="contact__title" text={contact.heading} />
          <p className="contact__lede">{contact.lede}</p>

          <div className="contact__direct">
            <span className="contact__label">Or email us directly</span>
            <a className="contact__email" href={`mailto:${site.email}`}>
              {/* Allow a line break before the @ rather than mid-domain. */}
              {site.email.split("@")[0]}
              <wbr />@{site.email.split("@")[1]}
            </a>
            <button className="contact__copy-btn" onClick={copyEmail} aria-live="polite">
              {copied ? "Copied to clipboard ✓" : "Copy address"}
            </button>
          </div>
        </div>

        <motion.div
          className="brief"
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "0px 0px -15% 0px" }}
          transition={{ duration: 1, ease: EASE_OUT }}
        >
          <AnimatePresence mode="wait" initial={false}>
            {sent ? (
              <motion.div
                key="sent"
                className="brief__sent"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                role="status"
              >
                <span className="brief__sent-icon" aria-hidden="true">
                  ✓
                </span>
                <h3>Your brief is ready to send.</h3>
                <p>
                  We've opened it in your email app — just hit send. If nothing opened, write to us at{" "}
                  <a href={`mailto:${site.email}`}>{site.email}</a>.
                </p>
                <button className="brief__again" onClick={() => setSent(false)}>
                  Edit my brief
                </button>
              </motion.div>
            ) : (
              <motion.form key="form" className="brief__form" onSubmit={onSubmit} exit={{ opacity: 0, y: -10 }}>
                <div className="brief__row">
                  <div className="field">
                    <input id="f-name" name="name" type="text" autoComplete="name" required placeholder=" " />
                    <label htmlFor="f-name">Your name</label>
                  </div>
                  <div className="field">
                    <input id="f-email" name="email" type="email" autoComplete="email" required placeholder=" " />
                    <label htmlFor="f-email">Email address</label>
                  </div>
                </div>
                <div className="brief__row">
                  <div className="field">
                    <input
                      id="f-phone"
                      name="phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      required
                      placeholder=" "
                      pattern="\+?[0-9\s\(\)\-]{7,20}"
                      title="Enter a valid mobile number, e.g. +91 98765 43210"
                    />
                    <label htmlFor="f-phone">Mobile number</label>
                  </div>
                  <div className="field">
                    <input id="f-company" name="company" type="text" autoComplete="organization" placeholder=" " />
                    <label htmlFor="f-company">Company (optional)</label>
                  </div>
                </div>

                <fieldset className="chips">
                  <legend>What do you need?</legend>
                  <div className="chips__list">
                    {contact.needs.map((n) => (
                      <button
                        key={n}
                        type="button"
                        className="chip"
                        aria-pressed={needs.includes(n)}
                        onClick={() => toggleNeed(n)}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <fieldset className="chips">
                  <legend>Ideal timeline</legend>
                  <div className="chips__list">
                    {contact.timelines.map((t) => (
                      <button
                        key={t}
                        type="button"
                        className="chip"
                        aria-pressed={timeline === t}
                        onClick={() => setTimeline(timeline === t ? "" : t)}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <div className="field field--area">
                  <textarea id="f-message" name="message" rows={4} required placeholder=" " />
                  <label htmlFor="f-message">Tell us about your project</label>
                </div>

                <div className="brief__submit">
                  <Button type="submit">
                    Send my brief
                  </Button>
                  <span className="brief__note">Opens your email app with everything filled in.</span>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}
