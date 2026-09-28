import { AnimatePresence, m } from "framer-motion";
import { useState, type FormEvent, type ReactNode } from "react";
import { TextLink } from "../actions/TextLink";
import { EASE, useMotionKit } from "../motion/core";
import { DrawIcon } from "../motion/DrawIcon";

export interface FormCardProps {
  /** Small terracotta label, e.g. "PHONE-ORDER PREFLIGHT". */
  kicker: string;
  /** Serif title. */
  title: string;
  /** Muted line under the title, e.g. a privacy promise. Keep one: it also spaces the title from the fields. */
  note?: string;
  /** Shown once sent: title, text, and an optional link (backLabel, backHref default "#top"). */
  success: { title: string; text: string; backLabel?: string; backHref?: string };
  /** Fields, then a FormActions row ending in a submit Button. */
  children: ReactNode;
  /** Seconds to wait, once in view, before the card rises. */
  delay?: number;
}

/** What replaces the form once it is sent. */
export type FormSuccessContent = FormCardProps["success"];

/**
 * A white form card with a kicker, serif title and privacy note. On submit it swaps to a confirmation.
 *
 * The confirmation shows a drawn check, its own title and text, and an
 * optional link back.
 */
export function FormCard({ kicker, title, note, success, children, delay = 0 }: FormCardProps) {
  const k = useMotionKit();
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <AnimatePresence mode="wait">
      {submitted ? (
        <m.div
          key="success"
          className="form-success"
          initial={k.reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          <DrawIcon name="check-circle" size={31} delay={0.2} />
          <h3>{success.title}</h3>
          <p>{success.text}</p>
          {success.backLabel && (
            <TextLink href={success.backHref ?? "#top"} className="light">
              {success.backLabel}
            </TextLink>
          )}
        </m.div>
      ) : (
        <m.form
          key="form"
          className="contact-form"
          onSubmit={handleSubmit}
          {...k.reveal(delay, 36)}
          exit={k.reduce ? undefined : { opacity: 0, y: -12, transition: { duration: 0.3 } }}
        >
          <div className="form-kicker">{kicker}</div>
          <h3>{title}</h3>
          {note && <p className="form-note">{note}</p>}
          {children}
        </m.form>
      )}
    </AnimatePresence>
  );
}
