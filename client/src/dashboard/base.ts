// Where the dashboard lives. On cohost.site it is under /dashboard; on
// dashboard.cohost.site (or any host starting with "dashboard.") it is the whole site.

export const ON_DASHBOARD_HOST = typeof window !== "undefined" && /^dashboard\./i.test(window.location.hostname);

/** cohost.site/demo: the example dashboard, with made-up data and no sign-in. */
export const IN_DEMO = !ON_DASHBOARD_HOST && typeof window !== "undefined" && /^\/demo(\/|$)/.test(window.location.pathname);

export const BASE = ON_DASHBOARD_HOST ? "" : IN_DEMO ? "/demo" : "/dashboard";

/** A link inside the dashboard. The home screen on its own host is "/". */
export function hrefTo(path: string): string {
  return `${BASE}${path}` || "/";
}
