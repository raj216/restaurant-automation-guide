import {
  CUSTOM_LIMITS,
  CUSTOM_MINUTES,
  findCustomPlanProblem,
  readCustomPlanFields,
  submitCustomPlan,
  type CustomPlanField,
} from "@/lib/leads";
import { randomId } from "@/lib/supabase";
import { ArrowRight, CircleCheck, X } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { PRICING } from "./content";

const COPY = PRICING.custom.form;

type Problem = { message: string; field?: CustomPlanField };

/**
 * The Custom plan's "Build My Plan" button, and the box it opens over the
 * page: a few questions about the restaurant. Requests land on the Leads
 * page (/admin) beside the pilot sign-ups.
 */
export function CustomPlan() {
  const box = useRef<HTMLDialogElement>(null);
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");
  const [problem, setProblem] = useState<Problem | null>(null);
  // Names this request, so a retry or a double click can't save it twice.
  const clientId = useRef(randomId());
  const startedAt = useRef<number | null>(null);

  const open = () => {
    // A request already sent starts a fresh one.
    if (status === "done") {
      clientId.current = randomId();
      startedAt.current = null;
      setStatus("idle");
    }
    setProblem(null);
    document.documentElement.style.overflow = "hidden";
    box.current?.showModal();
  };
  const close = () => box.current?.close();

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status !== "idle") return;
    const form = event.currentTarget;
    const fields = readCustomPlanFields(form);
    const focus = (field?: CustomPlanField) =>
      field && (form.elements.namedItem(field) as HTMLElement | null)?.focus();

    const local = findCustomPlanProblem(fields);
    if (local) {
      setProblem(local);
      focus(local.field);
      return;
    }
    setProblem(null);
    setStatus("sending");
    const result = await submitCustomPlan(
      fields,
      clientId.current,
      startedAt.current ?? Date.now()
    );
    if (result.ok) {
      form.reset();
      setStatus("done");
      return;
    }
    setStatus("idle");
    setProblem(result);
    focus(result.field);
  };

  const fieldProps = (name: CustomPlanField) => ({
    id: `plan-${name}`,
    name,
    "aria-invalid": problem?.field === name ? true : undefined,
    "aria-describedby": problem?.field === name ? "plan-note" : undefined,
    onChange: () => problem?.field === name && setProblem(null),
  });

  return (
    <>
      <button type="button" className="btn btn-ghost btn-lg" onClick={open}>
        {PRICING.custom.button}
        <ArrowRight size={17} className="nudge" />
      </button>
      {/* On the page itself, not in the pricing section: opening the box
          inside the section's reveal animation scrolled the page to the top. */}
      {createPortal(
        <dialog
          ref={box}
          className="plan-box"
          aria-labelledby="plan-box-title"
          onClose={() => (document.documentElement.style.overflow = "")}
          // A click on the blurred page around the box closes it.
          onClick={event => event.target === event.currentTarget && close()}
        >
          <div className="plan-box-inner">
            <button
              type="button"
              className="plan-box-close"
              aria-label={COPY.close}
              onClick={close}
            >
              <X size={20} />
            </button>
            <p className="eyebrow">
              <span>{PRICING.custom.name}</span>
            </p>
            <h2 id="plan-box-title">{COPY.title}</h2>
            {status === "done" ? (
              <div className="plan-box-done" role="status">
                <CircleCheck size={30} />
                <p>{COPY.done}</p>
                <button
                  type="button"
                  className="btn btn-primary btn-lg btn-block"
                  onClick={close}
                  autoFocus
                >
                  {COPY.doneButton}
                </button>
              </div>
            ) : (
              <>
                <p className="plan-box-text">{COPY.text}</p>
                <form
                  className="plan-box-form"
                  noValidate
                  onSubmit={onSubmit}
                  onFocus={() => {
                    startedAt.current ??= Date.now();
                  }}
                >
                  <label className="box-field box-wide">
                    <span>{COPY.restaurant}</span>
                    <input
                      {...fieldProps("restaurant")}
                      type="text"
                      placeholder={COPY.restaurantHint}
                      autoComplete="organization"
                      maxLength={CUSTOM_LIMITS.restaurant}
                      required
                    />
                  </label>
                  <label className="box-field">
                    <span>{COPY.phone}</span>
                    <input
                      {...fieldProps("phone")}
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      maxLength={CUSTOM_LIMITS.phone}
                      required
                    />
                  </label>
                  <label className="box-field">
                    <span>{COPY.email}</span>
                    <input
                      {...fieldProps("email")}
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      maxLength={CUSTOM_LIMITS.email}
                      required
                    />
                  </label>
                  <label className="box-field">
                    <span>{COPY.locations}</span>
                    <input
                      {...fieldProps("locations")}
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={CUSTOM_LIMITS.locations}
                      step={1}
                      defaultValue={1}
                      required
                    />
                  </label>
                  <label className="box-field">
                    <span>{COPY.minutes}</span>
                    <select {...fieldProps("minutes")} defaultValue="" required>
                      <option value="" disabled>
                        {COPY.minutesPick}
                      </option>
                      {CUSTOM_MINUTES.map(choice => (
                        <option key={choice} value={choice}>
                          {choice}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="box-field box-wide">
                    <span>{COPY.need}</span>
                    <textarea
                      {...fieldProps("need")}
                      rows={3}
                      placeholder={COPY.needHint}
                      maxLength={CUSTOM_LIMITS.need}
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
                    className="btn btn-primary btn-lg box-wide"
                    disabled={status === "sending"}
                  >
                    {status === "sending" ? (
                      <>
                        <span className="btn-spinner" aria-hidden="true" />
                        {COPY.sending}
                      </>
                    ) : (
                      <>
                        {COPY.submit}
                        <ArrowRight size={17} className="nudge" />
                      </>
                    )}
                  </button>
                  <p className="form-note box-wide" id="plan-note" role="alert">
                    {problem?.message}
                  </p>
                </form>
              </>
            )}
          </div>
        </dialog>,
        document.body
      )}
    </>
  );
}
