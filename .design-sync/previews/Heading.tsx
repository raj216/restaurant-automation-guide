import { Heading } from "@kadmivo/brand-kit";

export const PageTitle = () => (
  <div style={{ background: "var(--paper)", padding: 32 }}>
    <Heading level={1}>Recover the phone orders your restaurant misses during the rush.</Heading>
  </div>
);

export const SectionTitle = () => (
  <div style={{ background: "var(--paper)", padding: 32 }}>
    <Heading>When the dining room gets busy, the phone becomes another table to manage.</Heading>
  </div>
);

export const OnDark = () => (
  <div className="dark-section" style={{ padding: 32 }}>
    <Heading>Your restaurant stays in control.</Heading>
  </div>
);

export const CardTitle = () => (
  <div style={{ background: "var(--paper)", padding: 32 }}>
    <Heading level={3}>Your team checks every order</Heading>
  </div>
);
