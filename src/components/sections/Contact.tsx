import { AnimatePresence, motion } from "motion/react";
import { useRef, useState, type FormEvent } from "react";
import { contact, site } from "../../content";
import { EASE_OUT } from "../../lib/intro";
import { composeMail } from "../../lib/mail";
import { Button } from "../ui/Button";
import { Eyebrow } from "../ui/Eyebrow";
import { SplitText } from "../ui/SplitText";

/** "delivered": the brief reached the team. "mail": delivery failed, so it was opened in the visitor's email app. */
type Sent = false | "delivered" | "mail";

/**
 * Project brief form. Submitting posts the brief to /api/lead (api/lead.js), which forwards
 * it to the team's Telegram. If that fails for any reason, the brief is composed as an email
 * in the visitor's mail app instead, so no enquiry is lost.
 */
export function Contact() {
  const [needs, setNeeds] = useState<string[]>([]);
  const [timeline, setTimeline] = useState("");
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState<Sent>(false);
  const [sending, setSending] = useState(false);
  const shownAt = useRef(Date.now());

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

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (sending) return;
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

    setSending(true);
    let delivered = false;
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          source: "brief",
          name,
          email,
          phone,
          business: company,
          needs: needs.join(", "),
          timeline,
          message,
          website: String(data.get("website") ?? ""), // honeypot: people never see this field
          elapsedMs: Date.now() - shownAt.current,
          page: location.pathname,
        }),
      });
      delivered = res.ok;
    } catch {
      delivered = false;
    }
    setSending(false);

    if (delivered) {
      setSent("delivered");
    } else {
      composeMail(site.email, `New project enquiry — ${name || "website"}`, body);
      setSent("mail");
    }
  };

  return (
    <section id="contact" className="section section--sheet theme-ember contact" aria-labelledby="contact-title">
      <div className="container contact__grid">
        <div className="contact__copy">
          <Eyebrow index="09">Start a project</Eyebrow>
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
                {sent === "delivered" ? (
                  <>
                    <h3>Thanks, your brief is with us.</h3>
                    <p>
                      We'll reply within one business day from <a href={`mailto:${site.email}`}>{site.email}</a>. Asked for a
                      mock-up? It arrives within 48 hours.
                    </p>
                    <button className="brief__again" onClick={() => setSent(false)}>
                      Send another brief
                    </button>
                  </>
                ) : (
                  <>
                    <h3>Your brief is ready to send.</h3>
                    <p>
                      We couldn't send it from the page, so we've opened it in your email app — just hit send. If nothing
                      opened, write to us at <a href={`mailto:${site.email}`}>{site.email}</a>.
                    </p>
                    <button className="brief__again" onClick={() => setSent(false)}>
                      Edit my brief
                    </button>
                  </>
                )}
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

                {/* Honeypot: hidden from people and screen readers; bots that fill it are ignored. */}
                <div className="sr-only" aria-hidden="true">
                  <label htmlFor="f-website">Leave this field empty</label>
                  <input id="f-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
                </div>

                <div className="brief__submit">
                  <Button type="submit" disabled={sending}>
                    {sending ? "Sending…" : "Send my brief"}
                  </Button>
                  <span className="brief__note">Goes straight to our team. We reply within one business day.</span>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}
