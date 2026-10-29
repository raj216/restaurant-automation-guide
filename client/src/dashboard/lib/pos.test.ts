import { describe, expect, it } from "vitest";
import { CANCEL_FAILED_NOTE, SEND_FAILED_NOTE, canSendToPos, cleanError, posBanner, posJobFor, posStatusLine, sendResultMessage } from "./pos";
import type { PosConnection, PosJob } from "./types";

const conn = (status: PosConnection["status"]): PosConnection => ({
  restaurant_id: "r1",
  provider: "clover",
  status,
  last_error: status === "broken" ? "unreachable: down" : null,
  last_checked_at: null,
  menu_synced_at: null,
  menu_sync_issues: {},
  auto_send: false,
});
const job = (status: PosJob["status"], extra: Partial<PosJob> = {}): PosJob => ({
  order_id: "o1",
  status,
  attempts: 1,
  last_error: null,
  external_order_id: null,
  sent_at: null,
  updated_at: "2026-10-28T12:00:00Z",
  ...extra,
});

describe("Send to POS", () => {
  it("shows only for an order in review at a restaurant with a working POS", () => {
    expect(canSendToPos("pending_staff_review", conn("connected"), undefined)).toBe(true);
    expect(canSendToPos("pending_staff_review", null, undefined)).toBe(false); // no POS: enter by hand
    expect(canSendToPos("pending_staff_review", conn("broken"), undefined)).toBe(false);
    expect(canSendToPos("pending_staff_review", conn("disconnected"), undefined)).toBe(false);
    expect(canSendToPos("pos_entered", conn("connected"), undefined)).toBe(false);
  });
  it("can be tapped again after a failure, or to finish a send the POS already has; never for a cancelled one", () => {
    expect(canSendToPos("pending_staff_review", conn("connected"), job("failed"))).toBe(true);
    expect(canSendToPos("pending_staff_review", conn("connected"), job("sent"))).toBe(true);
    expect(canSendToPos("pos_entered", conn("connected"), job("sent"))).toBe(false);
    expect(canSendToPos("pending_staff_review", conn("connected"), job("cancel_pending"))).toBe(false);
  });
  it("finds the order's job", () => {
    expect(posJobFor({ id: "o1" }, [job("sent")])?.status).toBe("sent");
    expect(posJobFor({ id: "o2" }, [job("sent")])).toBeUndefined();
    expect(posJobFor({ id: "o1" }, undefined)).toBeUndefined();
  });
});

describe("POS status words", () => {
  it("says sent with the POS number, never 'accepted'", () => {
    const line = posStatusLine(job("sent", { external_order_id: "ABC123" }), "clover");
    expect(line?.text).toBe("Sent to Clover · Clover #ABC123");
    for (const status of ["sending", "sent", "failed", "cancel_pending", "cancelled", "cancel_failed"] as const) {
      expect(posStatusLine(job(status), "toast")?.text.toLowerCase()).not.toContain("accepted");
    }
  });
  it("a failed send says to enter it by hand, with a plain reason", () => {
    const line = posStatusLine(job("failed", { last_error: "unreachable: fake POS is down" }), "fake");
    expect(line).toEqual({ tone: "red", text: SEND_FAILED_NOTE, detail: "The POS didn't answer." });
    expect(SEND_FAILED_NOTE).toBe("Didn't reach the POS, enter it by hand");
    expect(posStatusLine(job("cancel_failed"), "fake")?.text).toBe(CANCEL_FAILED_NOTE);
    expect(cleanError("auth_failed: token revoked")).toMatch(/reconnect/);
    expect(cleanError("weird")).toBe("Something went wrong with the POS.");
  });
  it("send results become short messages", () => {
    expect(sendResultMessage({ ok: true, body: { status: "sent" } }).text).toBe("Sent to the kitchen.");
    expect(sendResultMessage({ ok: false, body: { status: "failed", note: SEND_FAILED_NOTE } })).toEqual({ text: SEND_FAILED_NOTE, tone: "warn" });
    expect(sendResultMessage({ ok: false, body: { error: "connection_broken" } }).text).toBe(SEND_FAILED_NOTE);
  });
});

describe("the red banner", () => {
  it("shows when the POS link is broken or a void failed, not otherwise", () => {
    expect(posBanner(null, [])).toBeNull();
    expect(posBanner(conn("connected"), [job("sent")])).toBeNull();
    expect(posBanner(conn("broken"), [])).toMatch(/Clover connection is broken.*enter them in the POS by hand/);
    expect(posBanner(conn("connected"), [job("cancel_failed"), job("cancel_failed", { order_id: "o2" })])).toMatch(/2 cancelled orders/);
  });
});

describe("the Kitchen screen on the counter's dashboard", () => {
  const kds = (status: PosConnection["status"]): PosConnection => ({ ...conn(status), provider: "kitchen_screen" });
  const now = new Date("2026-10-29T20:16:00Z");
  const seen = (minsAgo: number) => [{ screen_id: "screen-1", label: null, last_seen_at: new Date(now.getTime() - minsAgo * 60000).toISOString() }];
  it("shows the red banner when no kitchen tablet is on, even before a send fails", () => {
    expect(posBanner(kds("connected"), [], seen(1), now)).toBeNull();
    expect(posBanner(kds("connected"), [], seen(7), now)).toMatch(/No kitchen screen is on/);
    expect(posBanner(kds("broken"), [], seen(1), now)).toMatch(/No kitchen screen is on/);
    expect(posBanner(kds("disconnected"), [], [], now)).toBeNull();
  });
  it("says 'On the kitchen screen', then reminds the counter if nobody tapped Got it", () => {
    const sentAt = (m: number) => job("sent", { sent_at: new Date(now.getTime() - m * 60000).toISOString(), external_order_id: "KDS-1" });
    expect(posStatusLine(sentAt(1), "kitchen_screen", "pos_entered", now)?.text).toBe("On the kitchen screen");
    expect(posStatusLine(sentAt(4), "kitchen_screen", "pos_entered", now)).toEqual({
      tone: "amber",
      text: "Kitchen hasn't tapped Got it · 4 min",
      detail: "Check the kitchen tablet.",
    });
    expect(posStatusLine(job("cancelled", { external_order_id: "KDS-1" }), "kitchen_screen")?.text).toMatch(/CANCELLED on the kitchen screen/);
  });
});
