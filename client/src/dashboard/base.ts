// Where the dashboard lives. On cohost.site it is under /dashboard; on
// dashboard.cohost.site (or any host starting with "dashboard.") it is the whole site.

export const ON_DASHBOARD_HOST = typeof window !== "undefined" && /^dashboard\./i.test(window.location.hostname);

export const BASE = ON_DASHBOARD_HOST ? "" : "/dashboard";

/** A link inside the dashboard. The home screen on its own host is "/". */
export function hrefTo(path: string): string {
  return `${BASE}${path}` || "/";
}
