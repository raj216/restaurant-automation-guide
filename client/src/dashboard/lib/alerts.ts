// A soft chime, a browser notification and the tab title count for things that need a person.

import { prefs } from "./prefs";

let audio: AudioContext | null = null;

/** Browsers only allow sound after a tap, so the first tap anywhere unlocks it. */
export function unlockSound(): void {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    audio = audio ?? new Ctx();
    if (audio.state === "suspended") void audio.resume();
  } catch {
    /* no sound available */
  }
}

/** Two quiet notes. */
export function chime(): void {
  if (!prefs.getSound() || !audio || audio.state !== "running") return;
  const now = audio.currentTime;
  [660, 880].forEach((freq, i) => {
    const osc = audio!.createOscillator();
    const gain = audio!.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now + i * 0.16);
    gain.gain.exponentialRampToValueAtTime(0.12, now + i * 0.16 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.16 + 0.35);
    osc.connect(gain).connect(audio!.destination);
    osc.start(now + i * 0.16);
    osc.stop(now + i * 0.16 + 0.4);
  });
}

export function notificationsSupported(): boolean {
  return typeof Notification !== "undefined";
}

export async function enableNotifications(): Promise<boolean> {
  if (!notificationsSupported()) return false;
  const permission = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
  const on = permission === "granted";
  prefs.setNotify(on);
  return on;
}

export function notify(title: string, body: string): void {
  if (!notificationsSupported() || !prefs.getNotify() || Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, tag: "cohost-dashboard" });
  } catch {
    /* some browsers only allow notifications from a service worker */
  }
}

const BASE_TITLE = "CoHost AI Dashboard";

/** "(2) Needs review · CoHost" while orders are waiting. */
export function setTabTitle(waiting: number): void {
  document.title = waiting > 0 ? `(${waiting}) Needs review · CoHost` : BASE_TITLE;
}

/**
 * Ids that are in `now` but weren't in `before`. The first load counts nothing as new,
 * so opening the dashboard doesn't chime for everything already there.
 */
export function newIds(before: Set<string> | null, now: string[]): string[] {
  if (before === null) return [];
  return now.filter(id => !before.has(id));
}
