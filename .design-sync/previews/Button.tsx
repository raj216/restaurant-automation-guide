import { Button } from "@kadmivo/brand-kit";

export const LinkButton = () => (
  <div style={{ background: "var(--paper)", padding: 32 }}>
    <Button href="#how-it-works">See how it works</Button>
  </div>
);

export const SubmitButton = () => (
  <div style={{ background: "var(--paper)", padding: 32 }}>
    <Button type="submit">Request my phone-order review</Button>
  </div>
);

export const WithoutIcon = () => (
  <div style={{ background: "var(--paper)", padding: 32 }}>
    <Button href="#contact" icon={null}>Book a phone-order review</Button>
  </div>
);
