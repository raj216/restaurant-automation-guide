import {
  findPilotProblem,
  PILOT_LIMITS,
  readPilotFields,
  submitPilot,
  type PilotField,
} from "@/lib/leads";
import { randomId } from "@/lib/supabase";
import { AnimatePresence, m } from "framer-motion";
import { ArrowRight, CircleCheck } from "lucide-react";
import { useCallback, useRef, useState, type FormEvent } from "react";
import { PILOT } from "./content";
import { EASE, Reveal } from "./motion";

type Problem = { message: string; field?: PilotField };

/** The 14-day pilot sign-up. Sign-ups land on the Leads page (/admin). */
export function Pilot() {
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");
  const [problem, setProblem] = useState<Problem | null>(null);
  // Names this form fill, so a retry or a double click can't save it twice.
  const clientId = useRef(randomId());
  const startedAt = useRef<number | null>(null);
  const [start, end] = PILOT.title.split("a break");
  // The thank-you note takes focus as it appears (after the form has faded
  // out), so screen readers announce it and keyboard users aren't lost.
  const focusThanks = useCallback(
    (note: HTMLDivElement | null) => note?.focus(),
    []
  );

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status !== "idle") return;
    const form = event.currentTarget;
    const fields = readPilotFields(form);
    const focus = (field?: PilotField) =>
      field &&
      (form.elements.namedItem(field) as HTMLInputElement | null)?.focus();

    const local = findPilotProblem(fields);
    if (local) {
      setProblem(local);
      focus(local.field);
      return;
    }
    setProblem(null);
    setStatus("sending");
    const result = await submitPilot(
      fields,
      clientId.current,
      startedAt.current ?? Date.now()
    );
    if (result.ok) {
      setStatus("done");
      return;
    }
    setStatus("idle");
    setProblem(result);
    focus(result.field);
  };

  const fieldProps = (name: PilotField) => ({
    name,
    "aria-invalid": problem?.field === name ? true : undefined,
    "aria-describedby": problem ? "pilot-note" : undefined,
    onChange: () => problem?.field === name && setProblem(null),
  });

  return (
    <section className="section" id="pilot" aria-labelledby="pilot-title">
      <div className="wrap">
        <Reveal className="pilot-card" y={40}>
          <p className="eyebrow">
            <span>{PILOT.eyebrow}</span>
          </p>
          <h2 className="h2" id="pilot-title">
            {start}
            <span className="hl">a break</span>
            {end}
          </h2>
          <p className="lede">{PILOT.text}</p>
          <AnimatePresence mode="wait" initial={false}>
            {status === "done" ? (
              <m.div
                key="done"
                ref={focusThanks}
                className="pilot-done"
                role="status"
                tabIndex={-1}
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5, ease: EASE }}
              >
                <CircleCheck size={30} />
                <p>{PILOT.done}</p>
              </m.div>
            ) : (
              <m.form
                key="form"
                className="pilot-form"
                noValidate
                onSubmit={onSubmit}
                onFocus={() => {
                  startedAt.current ??= Date.now();
                }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: EASE }}
              >
                <label className="field field-wide">
                  <span className="sr-only">{PILOT.restaurant}</span>
                  <input
                    {...fieldProps("restaurant")}
                    type="text"
                    placeholder={PILOT.restaurant}
                    autoComplete="organization"
                    maxLength={PILOT_LIMITS.restaurant}
                    required
                  />
                </label>
                <label className="field">
                  <span className="sr-only">{PILOT.phone}</span>
                  <input
                    {...fieldProps("phone")}
                    type="tel"
                    inputMode="tel"
                    placeholder={PILOT.phone}
                    autoComplete="tel"
                    maxLength={PILOT_LIMITS.phone}
                    required
                  />
                </label>
                {/* People never see this box; bots fill it in. */}
                <div className="trap" aria-hidden="true">
                  <label>
                    Website
                    <input
                      name="website"
                      type="text"
                      tabIndex={-1}
                      autoComplete="off"
                    />
                  </label>
                </div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={status === "sending"}
                >
                  {status === "sending" ? (
                    <>
                      <span className="btn-spinner" aria-hidden="true" />
                      Sending…
                    </>
                  ) : (
                    <>
                      {PILOT.submit}
                      <ArrowRight size={17} className="nudge" />
                    </>
                  )}
                </button>
                <p className="form-note" id="pilot-note" role="alert">
                  {problem?.message}
                </p>
              </m.form>
            )}
          </AnimatePresence>
        </Reveal>
      </div>
    </section>
  );
}
