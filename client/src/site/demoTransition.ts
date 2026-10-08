import { useEffect } from "react";

const DEMO = "/demo";
const FADE_MS = 650;
const HOLD_MS = 250;

/** Starts downloading the dashboard while the visitor is still deciding, so it opens at once. */
let warmed = false;
function warmDashboard() {
  if (warmed) return;
  warmed = true;
  void import("@/dashboard/DashboardApp").catch(() => {
    warmed = false;
  });
}

function makeVeil(): HTMLDivElement {
  const veil = document.createElement("div");
  veil.className = "demo-veil";
  veil.setAttribute("role", "status");
  veil.innerHTML =
    '<span class="demo-veil-orb" aria-hidden="true"></span><p>Opening the example dashboard</p>';
  document.body.appendChild(veil);
  return veil;
}

/**
 * Links to the example dashboard fade the page out into the dashboard's own dark
 * ground, instead of the browser's hard white blink between two pages. Everything
 * else about the link stays a normal link: new tabs, modified clicks and
 * reduced-motion settings go straight through.
 */
export function useDemoTransition() {
  useEffect(() => {
    const isDemoLink = (target: EventTarget | null) =>
      (target as Element | null)?.closest?.(`a[href="${DEMO}"]`) as HTMLAnchorElement | null;

    const onOver = (event: Event) => {
      if (isDemoLink(event.target)) warmDashboard();
    };

    const onClick = (event: MouseEvent) => {
      const link = isDemoLink(event.target);
      if (!link || event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (link.target && link.target !== "_self") return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      event.preventDefault();
      warmDashboard();
      const veil = makeVeil();
      requestAnimationFrame(() => requestAnimationFrame(() => veil.classList.add("is-on")));
      window.setTimeout(() => window.location.assign(DEMO), FADE_MS + HOLD_MS);
    };

    // Coming back with the Back button can restore the page with the veil still on it.
    const onShow = (event: PageTransitionEvent) => {
      if (event.persisted) document.querySelectorAll(".demo-veil").forEach(v => v.remove());
    };

    document.addEventListener("pointerover", onOver, { passive: true });
    document.addEventListener("touchstart", onOver, { passive: true });
    document.addEventListener("focusin", onOver);
    document.addEventListener("click", onClick);
    window.addEventListener("pageshow", onShow);
    return () => {
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("touchstart", onOver);
      document.removeEventListener("focusin", onOver);
      document.removeEventListener("click", onClick);
      window.removeEventListener("pageshow", onShow);
    };
  }, []);
}
