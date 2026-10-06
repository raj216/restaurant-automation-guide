// The signed-in user, the restaurant they are looking at, and the live data that is
// refreshed every 10 seconds. (Supabase Realtime isn't turned on for these tables yet,
// so the dashboard asks again on a timer.)

import type { Session } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  DataError,
  db,
  fetchLiveData,
  fetchMemberships,
  fetchRestaurants,
  isStateConflict,
  transitionOrder,
  updateRestaurant,
  type RestaurantPatch,
} from "./lib/data";
import { chime, newIds, notify, setTabTitle, unlockSound } from "./lib/alerts";
import { needsReview } from "./lib/orders";
import { prefs, type Theme } from "./lib/prefs";
import { UndoStore, type PendingStep } from "./lib/undo";
import type { LiveData, Order, OrderState, Restaurant, Role } from "./lib/types";
import { callerLabel, orderCode } from "./lib/format";

export const POLL_MS = 10_000;

interface Dashboard {
  /** "loading" while the saved login is checked. */
  authState: "loading" | "signed_out" | "signed_in";
  user: { id: string; email: string } | null;
  signIn(email: string, password: string): Promise<string | null>;
  signOut(): Promise<void>;
  resetPassword(email: string): Promise<string | null>;

  restaurants: Restaurant[];
  roles: Record<string, Role>;
  restaurant: Restaurant | null;
  role: Role | null;
  canEdit: boolean;
  isOwner: boolean;
  /** The user has an account, but none of its memberships can use the dashboard. */
  noAccess: boolean;
  chooseRestaurant(id: string): void;
  setRestaurantLocal(next: Restaurant): void;
  saveSettings(patch: RestaurantPatch): Promise<Restaurant>;

  data: LiveData;
  loaded: boolean;
  lastUpdated: Date | null;
  offline: boolean;
  refresh(): Promise<void>;

  now: Date;
  theme: Theme;
  setTheme(theme: Theme): void;

  undo: UndoStore;
  pending: PendingStep[];
  /** Waits 5 seconds, then saves. */
  startStep(order: Order, to: OrderState, reason: string, label: string): void;
  /** Saves right away (Reject, Cancel). */
  moveOrderNow(order: Order, to: OrderState, reason: string): Promise<void>;
  displayState(order: Order): OrderState;
}

const Ctx = createContext<Dashboard | null>(null);

export function useDashboard(): Dashboard {
  const value = useContext(Ctx);
  if (!value) throw new Error("useDashboard must be used inside the dashboard");
  return value;
}

const EMPTY: LiveData = { orders: [], requests: [], calls: [] };

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [authState, setAuthState] = useState<Dashboard["authState"]>("loading");
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [roles, setRoles] = useState<Record<string, Role>>({});
  const [noAccess, setNoAccess] = useState(false);
  const [restaurantId, setRestaurantId] = useState<string | null>(prefs.getRestaurant());
  const [data, setData] = useState<LiveData>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [offline, setOffline] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [theme, setThemeState] = useState<Theme>(prefs.getTheme());

  // ---- Auth ----
  useEffect(() => {
    let alive = true;
    void db()
      .auth.getSession()
      .then(({ data: { session: s } }) => {
        if (!alive) return;
        setSession(s);
        setAuthState(s ? "signed_in" : "signed_out");
      });
    const { data: sub } = db().auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setAuthState(s ? "signed_in" : "signed_out");
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const userId = session?.user.id;

  // ---- Which restaurants this user can see ----
  useEffect(() => {
    if (!userId) {
      setRestaurants([]);
      setRoles({});
      setNoAccess(false);
      setData(EMPTY);
      setLoaded(false);
      return;
    }
    let alive = true;
    void (async () => {
      try {
        const memberships = (await fetchMemberships(userId)).filter(m => m.role === "owner" || m.role === "staff");
        const list = await fetchRestaurants(memberships.map(m => m.restaurant_id));
        if (!alive) return;
        setRoles(Object.fromEntries(memberships.map(m => [m.restaurant_id, m.role])));
        setRestaurants(list);
        setNoAccess(list.length === 0);
        setRestaurantId(current => (current && list.some(r => r.id === current) ? current : (list[0]?.id ?? null)));
      } catch {
        if (alive) setOffline(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [userId]);

  const restaurant = useMemo(() => restaurants.find(r => r.id === restaurantId) ?? null, [restaurants, restaurantId]);
  const role: Role | null = restaurant ? (roles[restaurant.id] ?? null) : null;

  // ---- A clock for "4 min ago" ----
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(t);
  }, []);

  // ---- Live data ----
  const busy = useRef(false);
  const knownWaiting = useRef<Set<string> | null>(null);
  const restaurantRef = useRef<Restaurant | null>(null);
  restaurantRef.current = restaurant;

  const refresh = useCallback(async () => {
    const current = restaurantRef.current;
    if (!current || busy.current) return;
    busy.current = true;
    try {
      const next = await fetchLiveData(current.id);
      if (restaurantRef.current?.id !== current.id) return;
      setData(next);
      setLoaded(true);
      setLastUpdated(new Date());
      setOffline(false);

      // New things that need a person: a soft chime and a notification.
      const waiting = [
        ...next.orders.filter(needsReview).map(o => `o:${o.id}`),
        ...next.requests.filter(r => r.status === "pending_staff_review").map(r => `r:${r.id}`),
      ];
      const fresh = newIds(knownWaiting.current, waiting);
      knownWaiting.current = new Set(waiting);
      if (fresh.length > 0) {
        chime();
        const firstOrder = next.orders.find(o => fresh.includes(`o:${o.id}`));
        if (firstOrder) {
          const who = callerLabel(firstOrder.customer_name, firstOrder.customer_phone);
          notify("New order to review", `${orderCode(firstOrder.id)} from ${who}`);
        } else {
          notify("New request to review", "Open the dashboard to see it.");
        }
      }
    } catch (error) {
      if (error instanceof DataError && /JWT|token|expired/i.test(error.message)) {
        void db().auth.signOut();
      } else {
        setOffline(true);
      }
    } finally {
      busy.current = false;
    }
  }, []);

  useEffect(() => {
    knownWaiting.current = null;
    setData(EMPTY);
    setLoaded(false);
    if (!restaurant?.id) return;
    void refresh();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, POLL_MS);
    const wake = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const goOnline = () => void refresh();
    const goOffline = () => setOffline(true);
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [restaurant?.id, refresh]);

  // The first tap anywhere unlocks the chime.
  useEffect(() => {
    const unlock = () => unlockSound();
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  // The tab shows how many orders are waiting.
  const waitingCount = data.orders.filter(needsReview).length;
  useEffect(() => {
    setTabTitle(waitingCount);
  }, [waitingCount]);

  // ---- Undo ----
  const undo = useMemo(() => new UndoStore(isStateConflict), []);
  const pending = useSyncExternalStore(
    cb => undo.onChange(cb),
    () => undoSnapshot(undo),
  );
  useEffect(() => {
    const off = undo.subscribe(event => {
      if (event.type === "saved" || event.type === "conflict") void refresh();
    });
    const warn = (e: BeforeUnloadEvent) => {
      if (undo.size > 0) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => {
      off();
      window.removeEventListener("beforeunload", warn);
    };
  }, [undo, refresh]);

  const startStep = useCallback(
    (order: Order, to: OrderState, reason: string, label: string) => {
      undo.schedule(
        { orderId: order.id, restaurantId: order.restaurant_id, code: orderCode(order.id), from: order.state, to, reason, label },
        () => transitionOrder({ restaurantId: order.restaurant_id, orderId: order.id, from: order.state, to, reason }),
      );
    },
    [undo],
  );

  const moveOrderNow = useCallback(
    async (order: Order, to: OrderState, reason: string) => {
      await transitionOrder({ restaurantId: order.restaurant_id, orderId: order.id, from: order.state, to, reason });
      await refresh();
    },
    [refresh],
  );

  const displayState = useCallback(
    (order: Order): OrderState => undo.pending(order.id)?.to ?? order.state,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [undo, pending],
  );

  // ---- Everything else ----
  const value: Dashboard = {
    authState,
    user: session ? { id: session.user.id, email: session.user.email ?? "" } : null,
    async signIn(email, password) {
      const { error } = await db().auth.signInWithPassword({ email: email.trim(), password });
      if (!error) return null;
      if (/invalid login/i.test(error.message)) return "That email and password don't match. Check them and try again.";
      return "Couldn't sign in. Check your connection and try again.";
    },
    async signOut() {
      await undo.flushAll();
      await db().auth.signOut();
    },
    async resetPassword(email) {
      const { error } = await db().auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/dashboard`,
      });
      return error ? "Couldn't send the email. Check the address and try again." : null;
    },
    restaurants,
    roles,
    restaurant,
    role,
    canEdit: role === "owner" || role === "staff",
    isOwner: role === "owner",
    noAccess,
    chooseRestaurant(id) {
      prefs.setRestaurant(id);
      setRestaurantId(id);
    },
    setRestaurantLocal(next) {
      setRestaurants(list => list.map(r => (r.id === next.id ? next : r)));
    },
    async saveSettings(patch) {
      if (!restaurant) throw new DataError("No restaurant selected.");
      const next = await updateRestaurant(restaurant.id, patch);
      setRestaurants(list => list.map(r => (r.id === next.id ? next : r)));
      return next;
    },
    data,
    loaded,
    lastUpdated,
    offline,
    refresh,
    now,
    theme,
    setTheme(next) {
      prefs.setTheme(next);
      setThemeState(next);
    },
    undo,
    pending,
    startStep,
    moveOrderNow,
    displayState,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// useSyncExternalStore needs the same array back until something changes.
let lastSnapshot: { store: UndoStore; key: string; steps: PendingStep[] } | null = null;
function undoSnapshot(store: UndoStore): PendingStep[] {
  const steps = store.all();
  const key = steps.map(s => `${s.orderId}:${s.to}`).join("|");
  if (!lastSnapshot || lastSnapshot.store !== store || lastSnapshot.key !== key) {
    lastSnapshot = { store, key, steps };
  }
  return lastSnapshot.steps;
}
