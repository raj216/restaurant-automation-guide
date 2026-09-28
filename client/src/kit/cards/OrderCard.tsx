import { m, useInView } from "framer-motion";
import { useRef, useState } from "react";
import { Icon } from "../brand/Icon";
import { glyphs } from "../brand/glyphs";
import { EASE, VIEWPORT, useMotionKit, type EntranceProps } from "../motion/core";
import { at } from "../utils";

const MotionPhone = m.create(glyphs.phone);

export interface OrderCardProps extends EntranceProps {
  /** Left of the dark top strip, e.g. "ASSISTED ORDER · SAMPLE". */
  kicker: string;
  /** Right of the top strip, e.g. "NOT A LIVE ORDER". */
  notice?: string;
  /** Small teal label above the title, e.g. "CUSTOMER CONFIRMED". */
  label: string;
  /** Serif title, e.g. "Order draft K-021". */
  title: string;
  /** Yellow badge beside the title, e.g. "Pending review". */
  badge?: string;
  /** e.g. "Pickup for Maya". */
  customer: string;
  /** e.g. "Today · 8:20 PM". */
  pickup: string;
  /** When the call came in, e.g. "7:42 PM". */
  time: string;
  /** Order lines: name ("1 × Rigatoni"), optional note ("extra sauce · no cheese"), price ("$19.00"). */
  items: { name: string; note?: string; price: string }[];
  /** Checklist rows; state done (green check), current (amber, pulsing) or pending (grey dot). */
  steps: { label: string; state: "done" | "current" | "pending" }[];
  /** Note along the bottom, after a shield icon. */
  footer?: string;
}

/** One line on the order. */
export type OrderItem = OrderCardProps["items"][number];

/** One row of the order's checklist. */
export type OrderStep = OrderCardProps["steps"][number];

/**
 * A tilted paper order ticket with a dark top strip, items, a status checklist and a footer note.
 *
 * Top to bottom: the kicker strip, the order title with a pending badge, the
 * customer and pickup time, the items, the checklist and the footer. In
 * motion it drops into place and fills in line by line, like a live order.
 */
export function OrderCard({
  kicker,
  notice,
  label,
  title,
  badge,
  customer,
  pickup,
  time,
  items,
  steps,
  footer,
  playOnLoad = false,
  ready = true,
  delay = 0.35,
}: OrderCardProps) {
  const k = useMotionKit();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, VIEWPORT);
  const [settled, setSettled] = useState(false);
  const active = ready && (playOnLoad || inView);

  // Once the card lands, its parts fill in on this schedule (seconds after
  // the card starts moving).
  const listAt = 1 + 0.15 * (items.length - 1) + 0.2;
  const stepAt = (i: number) => listAt + 0.15 + 0.25 * i;
  const footerAt = stepAt(steps.length - 1) + 0.2;
  const part = (t: number) =>
    k.reduce
      ? {}
      : {
          initial: { opacity: 0, y: 8 },
          animate: active ? { opacity: 1, y: 0 } : undefined,
          transition: { duration: 0.6, ease: EASE, delay: at(delay + t) },
        };
  const tick = (t: number) =>
    k.reduce
      ? {}
      : {
          initial: { scale: 0 },
          animate: active ? { scale: 1 } : undefined,
          transition: { type: "spring" as const, stiffness: 520, damping: 17, delay: at(delay + t) },
        };

  return (
    <m.div
      ref={ref}
      className="order-card"
      initial={k.reduce ? false : { opacity: 0, y: 70, rotate: -9 }}
      animate={active ? { opacity: 1, y: 0, rotate: -2.2 } : undefined}
      whileHover={settled ? { rotate: -1, y: -6 } : undefined}
      transition={settled ? { duration: 0.5, ease: EASE } : { duration: 1.2, ease: EASE, delay }}
      onAnimationComplete={() => setSettled(true)}
    >
      <m.div className="order-card-top" {...part(0.45)}>
        <span>{kicker}</span>
        {notice && <span>{notice}</span>}
      </m.div>
      <div className="order-card-body">
        <m.div className="order-card-label" {...part(0.6)}>
          {label}
        </m.div>
        <m.div className="order-title-row" {...part(0.7)}>
          <h2>{title}</h2>
          {badge && (
            <span className="pending-badge">
              <Icon name="clock" size={13} /> {badge}
            </span>
          )}
        </m.div>
        <m.div className="order-meta" {...part(0.8)}>
          {k.reduce ? (
            <Icon name="phone" size={16} />
          ) : (
            <MotionPhone
              size={16}
              animate={active ? { rotate: [0, -16, 14, -11, 8, -4, 0] } : undefined}
              transition={{ duration: 0.9, ease: "easeInOut", delay: at(delay + 1.05) }}
            />
          )}{" "}
          <div>
            <strong>{customer}</strong>
            <span>{pickup}</span>
          </div>
          <time>{time}</time>
        </m.div>
        <div className="order-items">
          {items.map((item, i) => (
            <m.div key={item.name} {...part(1 + 0.15 * i)}>
              <span>{item.name}</span>
              {item.note && <small>{item.note}</small>}
              <b>{item.price}</b>
            </m.div>
          ))}
        </div>
        <m.div className="status-list" {...part(listAt)}>
          {steps.map((step, i) => (
            <m.span
              key={step.label}
              className={step.state === "pending" ? undefined : step.state}
              {...part(stepAt(i))}
            >
              {step.state === "done" ? (
                <m.span {...tick(stepAt(i) + 0.1)}>
                  <Icon name="check" size={13} />
                </m.span>
              ) : step.state === "current" ? (
                <Icon name="user" size={13} />
              ) : (
                <span className="status-dot" />
              )}{" "}
              {step.label}
            </m.span>
          ))}
        </m.div>
      </div>
      {footer && (
        <m.div className="order-card-footer" {...part(footerAt)}>
          <Icon name="shield-check" size={16} /> {footer}
        </m.div>
      )}
    </m.div>
  );
}
