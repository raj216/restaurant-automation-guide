// The frame around every screen: sidebar (or bottom tabs on a phone), the top bar with
// the Brio status chip, the notification bell, the user menu, toasts and the offline banner.

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useDashboard } from "./DashboardContext";
import { brioStatus } from "./lib/brioStatus";
import { enableNotifications, notificationsSupported, unlockSound } from "./lib/alerts";
import { callerLabel, initials, orderCode, plural } from "./lib/format";
import { needsReview, recentEscalated } from "./lib/orders";
import { prefs } from "./lib/prefs";
import { formatNow, formatTime, relative } from "./lib/time";
import { Button, Icon, useDismiss, type IconKey } from "./ui";
import { ToastHost } from "./Toasts";

import { BASE, EMBED, hrefTo, IN_DEMO } from "./base";
export { BASE };

interface NavItem {
  path: string;
  label: string;
  short?: string;
  icon: IconKey;
  ownerOnly?: boolean;
}

const NAV: NavItem[] = [
  { path: "", label: "Now", icon: "home" },
  { path: "/orders", label: "Orders", icon: "orders" },
  { path: "/reservations", label: "Reservations", short: "Requests", icon: "calendar" },
  { path: "/messages", label: "Messages", icon: "message" },
  { path: "/calls", label: "Calls", icon: "phone" },
  { path: "/insights", label: "Insights", icon: "chart" },
  { path: "/menu", label: "Menu", icon: "book" },
  { path: "/settings", label: "Settings", icon: "sliders", ownerOnly: true },
];

function isActive(location: string, path: string): boolean {
  const full = `${BASE}${path}`;
  if (path === "") return location === BASE || location === `${BASE}/`;
  return location === full || location.startsWith(`${full}/`);
}

/** How many things need a person, for the badges. */
export function useBadges() {
  const { data, displayState } = useDashboard();
  return useMemo(() => {
    const orders = data.orders.filter(o => needsReview({ ...o, state: displayState(o) })).length;
    const escalated = data.orders.filter(o => o.state === "escalated").length;
    const reservations = data.requests.filter(r => r.kind === "reservation" && r.status === "pending_staff_review").length;
    const messages = data.requests.filter(r => r.kind === "callback" && r.status === "pending_staff_review").length;
    return { orders: orders + escalated, reviewing: orders, reservations, messages, now: orders + escalated + reservations + messages };
  }, [data, displayState]);
}

export function Shell({ children }: { children: ReactNode }) {
  const d = useDashboard();
  const [location] = useLocation();
  const badges = useBadges();
  const nav = NAV.filter(n => !n.ownerOnly || d.isOwner);
  // For the first moments the screen fades and rises in; later screens change quietly.
  const [booting, setBooting] = useState(true);
  const [noteHidden, setNoteHidden] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setBooting(false), 1600);
    return () => clearTimeout(t);
  }, []);
  const countFor = (path: string) =>
    path === "" ? badges.now : path === "/orders" ? badges.orders : path === "/reservations" ? badges.reservations : path === "/messages" ? badges.messages : 0;

  return (
    <div className={`cd${d.theme === "dark" ? " d-dark" : ""}${booting ? " d-boot" : ""}`} onPointerDown={unlockSound}>
      <aside className="d-side">
        <HomeLink className="d-brand">
          <LogoMark />
          <div>
            <b>CoHost AI</b>
            <small>Powered by Brio</small>
          </div>
        </HomeLink>
        <nav className="d-nav" aria-label="Main">
          {nav.map(item => {
            const count = countFor(item.path);
            const on = isActive(location, item.path);
            return (
              <Link key={item.path} href={hrefTo(item.path)} className={`d-ni${on ? " d-on" : ""}`} aria-current={on ? "page" : undefined}>
                <Icon name={item.icon} />
                {item.label}
                {count > 0 ? <span className="d-count" aria-label={`${count} need action`}>{count}</span> : null}
              </Link>
            );
          })}
        </nav>
        <div className="d-foot">
          Signed in as {d.role === "owner" ? "Owner" : "Staff"}
          <br />
          {d.user?.email}
        </div>
      </aside>
      <div className="d-main">
        <TopBar />
        {IN_DEMO && !EMBED && !noteHidden ? (
          <div className="d-banner d-demo" role="note">
            <Icon name="info" />
            <span className="d-banner-text">
              An example with made-up customers. Try the buttons, nothing here is real.
            </span>
            <span className="d-demo-links">
              <a className="d-demo-link d-demo-home" href="/">
                <Icon name="chevronLeft" size="s" />
                Back to cohost.site
              </a>
              <a className="d-demo-link" href="/#pilot">
                Start a free pilot
              </a>
            </span>
            <button type="button" className="d-banner-x" aria-label="Hide this note" onClick={() => setNoteHidden(true)}>
              <Icon name="x" size="s" />
            </button>
          </div>
        ) : null}
        {d.offline ? (
          <div className="d-banner d-offline" role="status">
            <Icon name="wifiOff" />
            You're offline. Showing the last update from {d.lastUpdated ? formatTime(d.lastUpdated, d.restaurant?.timezone ?? "America/New_York") : "earlier"}.
          </div>
        ) : null}
        {children}
        <nav className="d-tabbar" aria-label="Main">
          {nav.slice(0, 4).map(item => {
            const count = countFor(item.path);
            const on = isActive(location, item.path);
            return (
              <Link key={item.path} href={hrefTo(item.path)} className={on ? "d-on" : ""} aria-current={on ? "page" : undefined}>
                <Icon name={item.icon} />
                {item.short ?? item.label}
                {count > 0 ? <span className="d-count" aria-label={`${count} need action`}>{count}</span> : null}
              </Link>
            );
          })}
          <MoreTab nav={nav.slice(4)} location={location} />
        </nav>
      </div>
      <ToastHost />
    </div>
  );
}

function MoreTab({ nav, location }: { nav: NavItem[]; location: string }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useDismiss(open, close);
  const on = nav.some(n => isActive(location, n.path));
  return (
    <div ref={ref} style={{ flex: 1, position: "relative", display: "flex" }}>
      <button type="button" className={`d-more${on ? " d-on" : ""}`} aria-expanded={open} onClick={() => setOpen(o => !o)}>
        <svg className="d-i" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="5" cy="12" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="19" cy="12" r="1.5" />
        </svg>
        More
      </button>
      {open ? (
        <div className="d-menu d-moremenu">
          {nav.map(item => (
            <Link key={item.path} href={hrefTo(item.path)} className="d-mi" onClick={close}>
              <Icon name={item.icon} />
              {item.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id="cdlogo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffb547" />
          <stop offset=".35" stopColor="#ff6a55" />
          <stop offset=".6" stopColor="#ff4f9a" />
          <stop offset=".8" stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#38bdf8" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="#0e1119" />
      <path d="M21.9 10.3A8.2 8.2 0 1 0 21.9 21.7" fill="none" stroke="#f4f5f8" strokeWidth="3.4" strokeLinecap="round" />
      <circle cx="24.4" cy="16" r="3.1" fill="url(#cdlogo)" />
    </svg>
  );
}

const CHIP_TONE = { paused: "red", taking_orders: "green", last_call: "amber", closed: "gray" } as const;
const CHIP_ICON = { paused: "pause", taking_orders: null, last_call: "clock", closed: "moon" } as const;

/**
 * The logo, as a way home: in the example dashboard it goes straight back to
 * cohost.site's home page; in a restaurant's own dashboard, to Now.
 */
function HomeLink({ className, children }: { className: string; children: ReactNode }) {
  if (IN_DEMO)
    return (
      <a href="/" className={className} target={EMBED ? "_top" : undefined} aria-label="CoHost AI home page" title="Back to cohost.site">
        {children}
      </a>
    );
  return (
    <Link href={hrefTo("")} className={className} aria-label="CoHost AI, go to Now">
      {children}
    </Link>
  );
}

function TopBar() {
  const d = useDashboard();
  const tz = d.restaurant?.timezone ?? "America/New_York";
  const status = d.restaurant ? brioStatus(d.restaurant, d.now) : null;
  const tone = status ? CHIP_TONE[status.kind] : "gray";
  const icon = status ? CHIP_ICON[status.kind] : null;
  return (
    <header className="d-top">
      <HomeLink className="d-top-logo">
        <LogoMark size={32} />
      </HomeLink>
      <RestaurantSwitcher />
      {status ? (
        <span className={`d-chip d-p-${tone}`} role="status" title={status.label}>
          {icon ? <Icon name={icon} size="s" /> : <span className="d-dot" />}
          <span className="d-chip-text">{status.label}</span>
        </span>
      ) : null}
      <span className="d-sp d-clock">{formatNow(d.now, tz)}</span>
      <Bell />
      <UserMenu />
    </header>
  );
}

function RestaurantSwitcher() {
  const d = useDashboard();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useDismiss(open, close);
  const many = d.restaurants.length > 1;
  return (
    <div className="d-switcher-wrap" ref={ref}>
      <button type="button" className="d-switch" onClick={() => many && setOpen(o => !o)} aria-haspopup={many ? "menu" : undefined} aria-expanded={many ? open : undefined}>
        <span className="d-name-text">{d.restaurant?.name ?? "Loading…"}</span>
        {many ? <Icon name="chevronDown" size="s" /> : null}
      </button>
      {open ? (
        <div className="d-menu d-switcher-menu" role="menu">
          <div className="d-mh">Your restaurants</div>
          {d.restaurants.map(r => (
            <button
              key={r.id}
              type="button"
              role="menuitem"
              className="d-mi"
              onClick={() => {
                d.chooseRestaurant(r.id);
                close();
              }}
            >
              {r.id === d.restaurant?.id ? <Icon name="check" /> : <span style={{ width: 20 }} />}
              {r.name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Bell() {
  const d = useDashboard();
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(prefs.getSeen());
  const close = useCallback(() => setOpen(false), []);
  const ref = useDismiss(open, close);
  const tz = d.restaurant?.timezone ?? "America/New_York";

  const items = useMemo(() => {
    const list: { key: string; at: string; title: string; detail: string; href: string; icon: IconKey }[] = [];
    for (const o of d.data.orders.filter(o => needsReview(o) || recentEscalated(o, d.now))) {
      list.push({
        key: `o${o.id}`,
        at: o.created_at,
        title: o.state === "escalated" ? "A guest needs a call back" : "Order to review",
        detail: `${orderCode(o.id)} · ${callerLabel(o.customer_name, o.customer_phone)}`,
        href: `${BASE}/orders/${o.id}`,
        icon: o.state === "escalated" ? "phone" : "orders",
      });
    }
    for (const r of d.data.requests.filter(r => r.status === "pending_staff_review")) {
      list.push({
        key: `r${r.id}`,
        at: r.created_at,
        title: r.kind === "reservation" ? "Reservation request" : "New message",
        detail: r.customer_name,
        href: r.kind === "reservation" ? `${BASE}/reservations` : `${BASE}/messages`,
        icon: r.kind === "reservation" ? "calendar" : "message",
      });
    }
    return list.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 12);
  }, [d.data, d.now]);

  const unread = items.filter(i => new Date(i.at).getTime() > seen).length;
  return (
    <div className="d-topright" ref={ref}>
      <button
        type="button"
        className="d-iconbtn"
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
      >
        <Icon name="bell" />
        {unread > 0 ? <span className="d-badge">{unread}</span> : null}
      </button>
      {open ? (
        <div className="d-menu d-bellmenu">
          <div className="d-mh">What needs a person</div>
          {items.length === 0 ? <div className="d-note">All caught up.</div> : null}
          {items.map(i => (
            <Link key={i.key} href={i.href} className={`d-bellitem${new Date(i.at).getTime() > seen ? " d-new" : ""}`} onClick={close}>
              <Icon name={i.icon} />
              <span>
                <b>{i.title}</b>
                <br />
                <span className="d-muted">
                  {i.detail} · {relative(i.at, d.now)} · {formatTime(i.at, tz)}
                </span>
              </span>
            </Link>
          ))}
          {items.length > 0 ? (
            <Button
              kind="ghost"
              size="sm"
              onClick={() => {
                const t = Date.now();
                prefs.setSeen(t);
                setSeen(t);
              }}
            >
              Mark all as seen
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function UserMenu() {
  const d = useDashboard();
  const [open, setOpen] = useState(false);
  const [sound, setSound] = useState(prefs.getSound());
  const [notify, setNotify] = useState(prefs.getNotify());
  const close = useCallback(() => setOpen(false), []);
  const ref = useDismiss(open, close);
  useEffect(() => {
    setNotify(prefs.getNotify());
  }, [open]);
  return (
    <div className="d-topright" ref={ref}>
      <button type="button" className="d-avatar" aria-label="User menu" aria-expanded={open} onClick={() => setOpen(o => !o)}>
        {initials(d.user?.email)}
      </button>
      {open ? (
        <div className="d-menu" role="menu">
          <div className="d-mh">
            {d.user?.email}
            <br />
            {d.role === "owner" ? "Owner" : "Staff"}
          </div>
          <button type="button" className="d-mi" role="menuitem" onClick={() => d.setTheme(d.theme === "dark" ? "light" : "dark")}>
            <Icon name={d.theme === "dark" ? "sun" : "moon"} />
            {d.theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
          <button
            type="button"
            className="d-mi"
            role="menuitem"
            onClick={() => {
              prefs.setSound(!sound);
              setSound(!sound);
            }}
          >
            <Icon name={sound ? "volume" : "mute"} />
            {sound ? "Chime on" : "Chime off"}
          </button>
          {notificationsSupported() ? (
            <button
              type="button"
              className="d-mi"
              role="menuitem"
              onClick={async () => {
                if (notify) {
                  prefs.setNotify(false);
                  setNotify(false);
                } else {
                  setNotify(await enableNotifications());
                }
              }}
            >
              <Icon name="bell" />
              {notify ? "Browser alerts on" : "Turn on browser alerts"}
            </button>
          ) : null}
          <div className="d-note">{plural(d.restaurants.length, "restaurant")}</div>
          <button type="button" className="d-mi" role="menuitem" onClick={() => void d.signOut()}>
            <Icon name="logout" />
            {IN_DEMO ? "Back to cohost.site" : "Sign out"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
