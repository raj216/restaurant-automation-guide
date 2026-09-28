import { AnimatePresence, m } from "framer-motion";
import { createContext, useContext, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { TextLink } from "../actions/TextLink";
import { EASE, useMotionKit } from "../motion/core";
import { DrawIcon } from "../motion/DrawIcon";

/** What an onSubmit handler reports: sent, or the problem to show (and the field to focus). */
export type FormSubmitResult = { ok: true } | { ok: false; message: string; field?: string };

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
  /**
   * Sends the form. While it runs, the submit Button shows "Sending…".
   * On {ok: false} the card shows the message under the button and keeps
   * everything typed. Without it the confirmation shows straight away.
   */
  onSubmit?: (form: HTMLFormElement) => Promise<FormSubmitResult>;
}

/** What replaces the form once it is sent. */
export type FormSuccessContent = FormCardProps["success"];

const SendingContext = createContext(false);

/** True inside a FormCard while its onSubmit is running. The submit Button uses it. */
export function useFormSending() {
  return useContext(SendingContext);
}

/**
 * A white form card with a kicker, serif title and privacy note. On submit it swaps to a confirmation.
 *
 * The confirmation shows a drawn check, its own title and text, and an
 * optional link back. A hidden "website" box traps bots.
 */
export function FormCard({ kicker, title, note, success, children, delay = 0, onSubmit }: FormCardProps) {
  const k = useMotionKit();
  const [state, setState] = useState<"editing" | "sending" | "sent">("editing");
  const [problem, setProblem] = useState<string | null>(null);
  const successRef = useRef<HTMLDivElement>(null);

  // The confirmation is shorter than the form: keep it in view.
  useEffect(() => {
    if (state !== "sent") return;
    const box = successRef.current;
    if (box && box.getBoundingClientRect().top < 0) box.scrollIntoView({ block: "center" });
  }, [state]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "sending") return;
    if (!onSubmit) {
      setState("sent");
      return;
    }
    const form = event.currentTarget;
    setProblem(null);
    setState("sending");
    let result: FormSubmitResult;
    try {
      result = await onSubmit(form);
    } catch {
      result = { ok: false, message: "Something went wrong. Please try again." };
    }
    if (result.ok) {
      setState("sent");
      return;
    }
    setState("editing");
    setProblem(result.message);
    const field = result.field ? form.elements.namedItem(result.field) : null;
    if (field instanceof HTMLElement) field.focus();
  }

  return (
    <AnimatePresence mode="wait">
      {state === "sent" ? (
        <m.div
          key="success"
          ref={successRef}
          className="form-success"
          role="status"
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
          aria-busy={state === "sending"}
          {...k.reveal(delay, 36)}
          exit={k.reduce ? undefined : { opacity: 0, y: -12, transition: { duration: 0.3 } }}
        >
          <div className="form-kicker">{kicker}</div>
          <h3>{title}</h3>
          {note && <p className="form-note">{note}</p>}
          <div className="form-trap" aria-hidden="true">
            <label>
              Website
              <input type="text" name="website" tabIndex={-1} autoComplete="off" />
            </label>
          </div>
          <SendingContext.Provider value={state === "sending"}>{children}</SendingContext.Provider>
          <p className="form-problem" role="alert">
            {problem}
          </p>
        </m.form>
      )}
    </AnimatePresence>
  );
}
