import { Eyebrow, Heading } from "@kadmivo/brand-kit";

export const OnPaper = () => (
  <div style={{ background: "var(--paper)", padding: 32 }}>
    <Eyebrow>During the rush</Eyebrow>
  </div>
);

export const OnDark = () => (
  <div className="dark-section" style={{ padding: 32 }}>
    <Eyebrow>Built for real restaurant operations</Eyebrow>
  </div>
);

export const AboveAHeading = () => (
  <div style={{ background: "var(--paper)", padding: 32 }}>
    <Eyebrow>How one call becomes an approved order</Eyebrow>
    <Heading>One call. One order your team can check.</Heading>
  </div>
);
