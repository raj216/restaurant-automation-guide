// Words for reservation requests, messages and calls.

import type { CallCategory, CallLog, GuestRequest, MessageTopic, RequestStatus } from "./types";
import type { PillTone } from "./orders";

export const REQUEST_STATUS: Record<RequestStatus, { label: string; tone: PillTone }> = {
  pending_staff_review: { label: "To confirm", tone: "amber" },
  confirmed: { label: "Confirmed", tone: "green" },
  declined: { label: "Declined", tone: "red" },
  called_back: { label: "Called back", tone: "blue" },
  cancelled: { label: "Cancelled", tone: "gray" },
};

/** The same statuses worded for messages. */
export const MESSAGE_STATUS: Record<RequestStatus, { label: string; tone: PillTone }> = {
  pending_staff_review: { label: "To handle", tone: "amber" },
  called_back: { label: "Called back", tone: "blue" },
  confirmed: { label: "Handled", tone: "green" },
  declined: { label: "Not interested", tone: "gray" },
  cancelled: { label: "Cancelled", tone: "gray" },
};

/** Messages, most important first. An empty topic means General. */
export const TOPIC_ORDER: MessageTopic[] = [
  "complaint",
  "order_issue",
  "catering",
  "lost_and_found",
  "delivery",
  "general",
  "job_inquiry",
  "sales",
];

export const TOPIC_LABEL: Record<MessageTopic, string> = {
  general: "General",
  complaint: "Complaint",
  order_issue: "Order issue",
  catering: "Catering & events",
  lost_and_found: "Lost & found",
  delivery: "Delivery",
  job_inquiry: "Job inquiry",
  sales: "Sales",
};

export function topicOf(request: Pick<GuestRequest, "topic">): MessageTopic {
  return request.topic ?? "general";
}

/** Lower-priority topics start collapsed. */
export function isLowPriorityTopic(topic: MessageTopic): boolean {
  return topic === "job_inquiry" || topic === "sales";
}

export const CALL_CATEGORY_LABEL: Record<CallCategory, string> = {
  order: "Order",
  reservation: "Reservation",
  menu_question: "Menu question",
  general_question: "Question",
  message: "Message",
  job_inquiry: "Job seeker",
  sales: "Sales call",
  spam: "Spam blocked",
  complaint: "Complaint",
  catering: "Catering / event",
  lost_and_found: "Lost & found",
  order_issue: "Order issue",
  delivery: "Delivery",
  wrong_number: "Wrong number",
  no_conversation: "Hung up",
  other: "Other",
};

export function sentimentLabel(value: string | null | undefined): string {
  const v = (value ?? "").toLowerCase();
  if (v.startsWith("pos")) return "Positive";
  if (v.startsWith("neg")) return "Negative";
  if (v) return "Neutral";
  return "";
}

/** Calls started from the website's Talk to Brio button are tests. */
export function isTestCall(call: Pick<CallLog, "call_type">): boolean {
  return call.call_type === "web_call";
}

export function callTime(call: Pick<CallLog, "started_at" | "created_at">): string {
  return call.started_at ?? call.created_at;
}
