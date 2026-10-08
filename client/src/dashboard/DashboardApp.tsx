// The manager dashboard: sign in, then the screens. Loaded only when someone visits /dashboard.

import { Suspense, useEffect } from "react";
import { useLocation } from "wouter";
import "./dashboard.css";
import { IN_DEMO } from "./base";
import { DashboardProvider, useDashboard } from "./DashboardContext";
import { BASE, Shell } from "./Shell";
import Calls from "./screens/Calls";
import Insights from "./screens/Insights";
import Menu from "./screens/Menu";
import Messages from "./screens/Messages";
import Now from "./screens/Now";
import Orders from "./screens/Orders";
import Reservations from "./screens/Reservations";
import Settings from "./screens/Settings";
import SignIn, { NoAccess } from "./screens/SignIn";

function Screen() {
  const [location] = useLocation();
  const parts = location.replace(BASE, "").split("/").filter(Boolean);
  const [section, id] = parts;
  switch (section) {
    case "orders":
      return <Orders selectedId={id ?? null} />;
    case "reservations":
      return <Reservations />;
    case "messages":
      return <Messages />;
    case "calls":
      return <Calls selectedId={id ?? null} />;
    case "insights":
      return <Insights />;
    case "menu":
      return <Menu />;
    case "settings":
      return <Settings />;
    default:
      return <Now />;
  }
}

function Gate() {
  const d = useDashboard();
  if (d.authState === "loading") {
    // Stay on the dark ground the visitor came from, so nothing flashes.
    return <div className={`cd${d.theme === "dark" || IN_DEMO ? " d-dark" : ""}`} aria-busy="true" />;
  }
  if (d.authState === "signed_out") return <SignIn />;
  if (d.noAccess) return <NoAccess />;
  return (
    <Shell>
      <Screen />
    </Shell>
  );
}

export default function DashboardApp() {
  // Search engines should never list the dashboard, on either address.
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);
  return (
    <DashboardProvider>
      <Suspense fallback={null}>
        <Gate />
      </Suspense>
    </DashboardProvider>
  );
}
