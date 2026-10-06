// Shapes of the rows the manager dashboard reads from the CoHost AI database.
// Only the columns the dashboard uses are listed.

export type Role = "owner" | "staff" | "agent";

export type OrderState =
  | "draft"
  | "validated"
  | "caller_confirmed"
  | "pending_staff_review"
  | "pos_entered"
  | "pos_accepted"
  | "fulfilled"
  | "cancelled"
  | "rejected"
  | "escalated";

export type DayKey = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";

export interface ShiftWindow {
  day: DayKey;
  /** 24-hour "HH:MM". */
  start: string;
  /** 24-hour "HH:MM". Earlier than start means the shift runs past midnight. */
  end: string;
}

export interface ClosedDate {
  /** "YYYY-MM-DD" */
  date: string;
  reason: string;
}

export interface Restaurant {
  id: string;
  name: string;
  timezone: string;
  currency: string;
  accepting_orders: boolean;
  staffed_review_windows: ShiftWindow[];
  closed_dates: ClosedDate[];
  last_call_minutes: number;
  takes_reservation_requests: boolean;
  host_notes: string | null;
  phone_number: string | null;
  transfer_phone_number: string | null;
  current_menu_version: number;
}

export interface Membership {
  restaurant_id: string;
  role: Role;
}

export interface OrderModifier {
  group_name?: string;
  option_name: string;
  price_cents?: number;
  placement?: "before" | "with" | "comma";
}

export interface LineItem {
  sku?: string;
  name: string;
  quantity: number;
  unit_price_cents: number;
  line_total_cents: number;
  modifiers?: OrderModifier[];
}

export interface Order {
  id: string;
  restaurant_id: string;
  state: OrderState;
  created_at: string;
  updated_at: string;
  customer_name: string | null;
  customer_phone: string | null;
  requested_pickup_time: string | null;
  intake_mode: "staffed" | "after_hours_request" | null;
  staff_review_deadline: string | null;
  payment_method: "pay_at_pickup" | "payment_link" | null;
  currency: string;
  subtotal_cents: number | null;
  line_items: LineItem[];
  allergy_note: string | null;
  call_id: string | null;
  menu_version: number;
}

export interface OrderEvent {
  id: number;
  order_id: string;
  from_state: OrderState | null;
  to_state: OrderState;
  actor_kind: "agent" | "staff" | "admin";
  actor_user_id: string | null;
  reason: string;
  created_at: string;
}

export type RequestKind = "reservation" | "callback";
export type RequestStatus = "pending_staff_review" | "confirmed" | "declined" | "called_back" | "cancelled";
export type MessageTopic =
  | "general"
  | "job_inquiry"
  | "sales"
  | "delivery"
  | "complaint"
  | "lost_and_found"
  | "catering"
  | "order_issue";

export interface GuestRequest {
  id: string;
  restaurant_id: string;
  kind: RequestKind;
  status: RequestStatus;
  call_id: string | null;
  customer_name: string;
  customer_phone: string;
  party_size: number | null;
  requested_time: string | null;
  note: string | null;
  topic: MessageTopic | null;
  allergy_note: string | null;
  created_at: string;
  updated_at: string;
}

export type CallCategory =
  | "order"
  | "reservation"
  | "menu_question"
  | "general_question"
  | "message"
  | "job_inquiry"
  | "sales"
  | "spam"
  | "complaint"
  | "catering"
  | "lost_and_found"
  | "order_issue"
  | "delivery"
  | "wrong_number"
  | "no_conversation"
  | "other";

export interface CallLog {
  id: string;
  restaurant_id: string;
  call_id: string;
  call_type: "phone_call" | "web_call" | null;
  from_number: string | null;
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
  category: CallCategory;
  summary: string | null;
  caller_name: string | null;
  allergies: string | null;
  needs_follow_up: boolean | null;
  sentiment: string | null;
  ended_by: string | null;
  transcript?: string | null;
  created_at: string;
}

export interface ModifierOption {
  key: string;
  name: string;
  price_cents: number;
}

export interface ModifierGroup {
  key: string;
  name: string;
  options: ModifierOption[];
  max_choices?: number;
  placement?: string;
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  menu_version: number;
  sku: string;
  name: string;
  price_cents: number;
  available: boolean;
  description: string | null;
  dietary_tags: string[];
  popular: boolean;
  required_modifiers: ModifierGroup[];
  optional_modifiers: ModifierGroup[];
}

/** What the live board polls for. */
export interface LiveData {
  /** Orders that reached the restaurant, plus orders that need a person. */
  orders: Order[];
  requests: GuestRequest[];
  calls: CallLog[];
}
