// Choices this device remembers: theme, sound, dismissed cards, the restaurant picked.

const KEYS = {
  theme: "cohost.dash.theme",
  sound: "cohost.dash.sound",
  notify: "cohost.dash.notify",
  restaurant: "cohost.dash.restaurant",
  dismissed: "cohost.dash.dismissed",
  seen: "cohost.dash.seen",
} as const;

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode or full: the choice just isn't remembered */
  }
}

export type Theme = "light" | "dark";

export const prefs = {
  getTheme(): Theme {
    return read(KEYS.theme) === "dark" ? "dark" : "light";
  },
  setTheme(theme: Theme) {
    write(KEYS.theme, theme);
  },
  /** The chime for new orders and requests. On unless turned off. */
  getSound(): boolean {
    return read(KEYS.sound) !== "off";
  },
  setSound(on: boolean) {
    write(KEYS.sound, on ? "on" : "off");
  },
  getNotify(): boolean {
    return read(KEYS.notify) === "on";
  },
  setNotify(on: boolean) {
    write(KEYS.notify, on ? "on" : "off");
  },
  getRestaurant(): string | null {
    return read(KEYS.restaurant);
  },
  setRestaurant(id: string) {
    write(KEYS.restaurant, id);
  },
  /** "Dismiss" on a Needs-a-person card hides it on this device only. */
  getDismissed(): Set<string> {
    try {
      return new Set(JSON.parse(read(KEYS.dismissed) ?? "[]") as string[]);
    } catch {
      return new Set();
    }
  },
  addDismissed(id: string): Set<string> {
    const set = prefs.getDismissed();
    set.add(id);
    write(KEYS.dismissed, JSON.stringify([...set].slice(-200)));
    return set;
  },
  /** When the bell was last opened. */
  getSeen(): number {
    return Number(read(KEYS.seen) ?? 0) || 0;
  },
  setSeen(ms: number) {
    write(KEYS.seen, String(ms));
  },
};
