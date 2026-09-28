import { Reveal } from "@kadmivo/brand-kit";

export const RiseParagraph = () => (
  <div style={{ background: "var(--paper)", padding: 32 }}>
    <Reveal as="p" className="large-copy">
      Kadmivo handles the routine parts of the call. Your team makes the final decision.
    </Reveal>
  </div>
);

export const WipeRuledRow = () => (
  <div style={{ background: "var(--paper)", padding: 32 }}>
    <Reveal variant="wipe" className="trust-strip">
      <span>Orders completed</span>
      <span>Team review time</span>
      <span>Corrections and transfers</span>
    </Reveal>
  </div>
);
