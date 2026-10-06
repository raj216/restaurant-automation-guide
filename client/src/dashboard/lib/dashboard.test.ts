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
});
