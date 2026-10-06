// Forward steps on an order (Entered in POS, Accepted in POS, Picked up) can never be
// reversed once saved. So the dashboard waits 5 seconds, shows an Undo button, and
// only then saves. This small store keeps the waiting steps, so the wait carries on
// when staff move to another screen.

import type { OrderState } from "./types";

export const UNDO_WINDOW_MS = 5000;

export interface PendingStep {
  orderId: string;
  restaurantId: string;
  code: string;
  from: OrderState;
  to: OrderState;
  reason: string;
  /** What the toast says, for example "Entered in POS". */
  label: string;
  expiresAt: number;
}

export type StepEvent =
  | { type: "scheduled"; step: PendingStep }
  | { type: "undone"; step: PendingStep }
  | { type: "saved"; step: PendingStep }
  | { type: "conflict"; step: PendingStep }
  | { type: "failed"; step: PendingStep; error: unknown };

type Listener = (event: StepEvent) => void;

export class UndoStore {
  private steps = new Map<string, { step: PendingStep; timer: ReturnType<typeof setTimeout>; commit: () => Promise<void> }>();
  private listeners = new Set<Listener>();
  private snapshotListeners = new Set<() => void>();
  private isConflict: (error: unknown) => boolean;
  private windowMs: number;

  constructor(isConflict: (error: unknown) => boolean, windowMs = UNDO_WINDOW_MS) {
    this.isConflict = isConflict;
    this.windowMs = windowMs;
  }

  /** Waits, then saves. A second tap on the same order replaces nothing: it's ignored. */
  schedule(step: Omit<PendingStep, "expiresAt">, commit: () => Promise<void>, now = Date.now()): PendingStep | null {
    if (this.steps.has(step.orderId)) return null;
    const full: PendingStep = { ...step, expiresAt: now + this.windowMs };
    const timer = setTimeout(() => void this.run(step.orderId), this.windowMs);
    this.steps.set(step.orderId, { step: full, timer, commit });
    this.emit({ type: "scheduled", step: full });
    return full;
  }

  /** Cancels a waiting step before it saves. */
  undo(orderId: string): boolean {
    const entry = this.steps.get(orderId);
    if (!entry) return false;
    clearTimeout(entry.timer);
    this.steps.delete(orderId);
    this.emit({ type: "undone", step: entry.step });
    return true;
  }

  /** Saves everything waiting right now, for example when the tab is closing. */
  async flushAll(): Promise<void> {
    await Promise.all([...this.steps.keys()].map(id => this.run(id)));
  }

  pending(orderId: string): PendingStep | undefined {
    return this.steps.get(orderId)?.step;
  }

  all(): PendingStep[] {
    return [...this.steps.values()].map(e => e.step);
  }

  get size(): number {
    return this.steps.size;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** For React: called whenever the set of waiting steps changes. */
  onChange(listener: () => void): () => void {
    this.snapshotListeners.add(listener);
    return () => this.snapshotListeners.delete(listener);
  }

  private async run(orderId: string): Promise<void> {
    const entry = this.steps.get(orderId);
    if (!entry) return;
    clearTimeout(entry.timer);
    try {
      await entry.commit();
      this.steps.delete(orderId);
      this.emit({ type: "saved", step: entry.step });
    } catch (error) {
      this.steps.delete(orderId);
      this.emit(this.isConflict(error) ? { type: "conflict", step: entry.step } : { type: "failed", step: entry.step, error });
    }
  }

  private emit(event: StepEvent): void {
    for (const l of this.listeners) l(event);
    for (const l of this.snapshotListeners) l();
  }
}
