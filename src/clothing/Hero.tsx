import { AnimatePresence, motion } from "motion/react";
import { useState, type FormEvent } from "react";
import { group } from "../brand";
import { Button } from "../components/ui/Button";
import { Mark } from "../components/ui/Logo";
import { composeMail } from "../lib/mail";

export function ClothingLogo() {
  return (
    <span className="cl-logo">
      <Mark size={22} dot="button" />
      <span className="cl-logo__word">Auvier</span>
      <span className="cl-logo__sub">Clothing</span>
    </span>
  );
}

/** Email-only quick sign-up, used in the story's final chapter. */
export function QuickNotify() {
  const [sent, setSent] = useState(false);
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    composeMail(
      group.email,
      "Auvier Clothing — notify me about Collection 01",
      `Hi Auvier Clothing,\n\nPlease let me know when Collection 01 launches.\n\nEmail: ${email}`,
    );
    setSent(true);
  };

  return (
    <AnimatePresence mode="wait" initial={false}>
      {sent ? (
        <motion.p key="sent" className="cl-quick__sent" role="status" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          Almost done — just hit send in your email app. <button onClick={() => setSent(false)}>Edit</button>
        </motion.p>
      ) : (
        <motion.form key="form" className="cl-quick" onSubmit={onSubmit} exit={{ opacity: 0 }}>
          <label htmlFor="cl-quick-email" className="sr-only">
            Email address
          </label>
          <input id="cl-quick-email" name="email" type="email" required autoComplete="email" placeholder="Your email address" />
          <Button type="submit" size="sm" icon="none" magnetic={false}>
            Notify me
          </Button>
        </motion.form>
      )}
    </AnimatePresence>
  );
}
