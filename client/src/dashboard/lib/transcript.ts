// Turns a call transcript into chat lines: "Brio:" on the left, "Caller:" on the right.

export interface ChatLine {
  speaker: "brio" | "caller";
  text: string;
}

const BRIO = /^\s*(brio|agent|assistant|ai)\s*:\s*(.*)$/i;
const CALLER = /^\s*(caller|user|customer|guest|human)\s*:\s*(.*)$/i;

/**
 * Lines that start with a speaker name begin a new bubble; other lines continue the
 * bubble before them. Returns null when the transcript has no speaker names at all,
 * so the screen can show it as plain text instead.
 */
export function parseTranscript(text: string | null | undefined): ChatLine[] | null {
  if (!text || !text.trim()) return null;
  const lines: ChatLine[] = [];
  for (const raw of text.split(/\r?\n/)) {
    if (!raw.trim()) continue;
    const brio = BRIO.exec(raw);
    const caller = brio ? null : CALLER.exec(raw);
    if (brio) lines.push({ speaker: "brio", text: brio[2].trim() });
    else if (caller) lines.push({ speaker: "caller", text: caller[2].trim() });
    else if (lines.length) lines[lines.length - 1].text += ` ${raw.trim()}`;
  }
  return lines.length ? lines : null;
}
