import { TextLink } from "@kadmivo/brand-kit";

export const Default = () => (
  <div style={{ background: "var(--paper)", padding: 32 }}>
    <TextLink href="#contact">Book a phone-order review</TextLink>
  </div>
);

export const WithArrowRight = () => (
  <div style={{ background: "var(--paper)", padding: 32 }}>
    <TextLink href="#trial" icon="arrow-right">See the supervised trial</TextLink>
  </div>
);
