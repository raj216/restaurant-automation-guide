import { describe, expect, it, vi } from "vitest";
import { brioStatus } from "./brioStatus";
import { actionsFor, inTab, waitTone } from "./orders";
import { orderCode, looksLikeCardNumber } from "./format";
import { parseTranscript } from "./transcript";
import { UndoStore } from "./undo";
import type { Order, Restaurant } from "./types";

const base: Restaurant = {
  id: "r1",
  name: "Test",
  timezone: "America/New_York",
  currency: "USD",
  accepting_orders: true,
  staffed_review_windows: [{ day: "fri", start: "17:00", end: "02:00" }],
  closed_dates: [],
  last_call_minutes: 30,
  takes_reservation_requests: true,
  host_notes: null,
  phone_number: null,
  transfer_phone_number: null,
  current_menu_version: 1,
};

describe("brioStatus", () => {
  it("is paused when orders are off", () => {
    expect(brioStatus({ ...base, accepting_orders: false }, new Date()).kind).toBe("paused");
  });
  it("takes orders during a shift, and an overnight shift belongs to its start day", () => {
    // Friday 9 pm New York = Saturday 01:00 UTC (EDT)
    expect(brioStatus(base, new Date("2026-06-13T01:00:00Z")).kind).toBe("taking_orders");
    // Saturday 1:00 am New York is still Friday's shift; 1:45 am is last call
    expect(brioStatus(base, new Date("2026-06-13T05:00:00Z")).kind).toBe("taking_orders");
    expect(brioStatus(base, new Date("2026-06-13T05:45:00Z")).kind).toBe("last_call");
    // Saturday 3 am: closed
    expect(brioStatus(base, new Date("2026-06-13T07:00:00Z")).kind).toBe("closed");
  });
  it("a closed date removes shifts that start that day", () => {
    const r = { ...base, closed_dates: [{ date: "2026-06-12", reason: "Event" }] };
    expect(brioStatus(r, new Date("2026-06-13T01:00:00Z")).kind).toBe("closed");
  });
});

describe("orders", () => {
  it("offers only the allowed next steps", () => {
    expect(actionsFor("pending_staff_review").map(a => a.to)).toEqual(["pos_entered", "rejected", "cancelled"]);
    expect(actionsFor("pos_accepted").map(a => a.to)).toEqual(["fulfilled", "cancelled"]);
    expect(actionsFor("fulfilled")).toEqual([]);
  });
  it("sorts orders into tabs", () => {
    const o = { state: "rejected" } as Order;
    expect(inTab(o, "problems")).toBe(true);
    expect(inTab(o, "done")).toBe(false);
  });
  it("colors the wait", () => {
    expect([waitTone(1), waitTone(3), waitTone(7)]).toEqual(["normal", "amber", "red"]);
  });
  it("shows a short order code", () => {
    expect(orderCode("a1b2c3d4-0000")).toBe("#A1B2C3");
  });
  it("catches card-like numbers", () => {
    expect(looksLikeCardNumber("4242 4242 4242 4242")).toBe(true);
    expect(looksLikeCardNumber("out of rigatoni")).toBe(false);
  });
});

describe("transcript", () => {
  it("turns speaker lines into bubbles", () => {
    expect(parseTranscript("Agent: Hi\nUser: Hello")?.map(l => l.speaker)).toEqual(["brio", "caller"]);
    expect(parseTranscript("just text")).toBeNull();
  });
});

describe("UndoStore", () => {
  it("saves after the wait and can be undone", async () => {
    vi.useFakeTimers();
    const store = new UndoStore(() => false, 5000);
    const commit = vi.fn(async () => undefined);
    const step = { orderId: "o1", restaurantId: "r1", code: "#A", from: "pending_staff_review" as const, to: "pos_entered" as const, reason: "x", label: "L" };
    store.schedule(step, commit);
    store.undo("o1");
    await vi.advanceTimersByTimeAsync(6000);
    expect(commit).not.toHaveBeenCalled();
    store.schedule(step, commit);
    await vi.advanceTimersByTimeAsync(6000);
    expect(commit).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("saves every waiting step at once when the screen is left, and never twice", async () => {
    vi.useFakeTimers();
    const store = new UndoStore(() => false, 5000);
    const base = { restaurantId: "r1", code: "#A", from: "pending_staff_review" as const, to: "pos_entered" as const, reason: "x", label: "L" };
    const first = vi.fn(async () => undefined);
    const second = vi.fn(async () => undefined);
    store.schedule({ ...base, orderId: "o1" }, first);
    store.schedule({ ...base, orderId: "o2" }, second);
    await vi.advanceTimersByTimeAsync(1000);
    expect(first).not.toHaveBeenCalled();
    await store.flushAll();
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
    expect(store.size).toBe(0);
    // the timers that were waiting must not save them again
    await vi.advanceTimersByTimeAsync(6000);
    await store.flushAll();
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("does not save a step a second time while it is already being saved", async () => {
    vi.useFakeTimers();
    const store = new UndoStore(() => false, 5000);
    let finish: () => void = () => undefined;
    const commit = vi.fn(() => new Promise<void>(resolve => (finish = resolve)));
    store.schedule({ restaurantId: "r1", code: "#A", from: "pending_staff_review", to: "pos_entered", reason: "x", label: "L", orderId: "o1" }, commit);
    await vi.advanceTimersByTimeAsync(5000); // the wait is over and the save is on its way
    void store.flushAll(); // ...and the screen is closed at the same moment
    finish();
    await vi.advanceTimersByTimeAsync(10);
    expect(commit).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("refuses to undo a step whose save has already started", async () => {
    vi.useFakeTimers();
    const store = new UndoStore(() => false, 5000);
    let finish: () => void = () => undefined;
    const commit = vi.fn(() => new Promise<void>(resolve => (finish = resolve)));
    store.schedule({ restaurantId: "r1", code: "#A", from: "pending_staff_review", to: "pos_entered", reason: "x", label: "L", orderId: "o1" }, commit);
    await vi.advanceTimersByTimeAsync(5000);
    expect(store.undo("o1")).toBe(false);
    finish();
    await vi.advanceTimersByTimeAsync(10);
    expect(commit).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
