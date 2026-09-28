import { ArrowLink, Text } from "@kadmivo/brand-kit";

export const OnDark = () => (
  <div className="dark-section" style={{ padding: 32 }}>
    <ArrowLink href="#contact">Book a phone-order review</ArrowLink>
  </div>
);

export const AfterAParagraph = () => (
  <div className="dark-section" style={{ padding: 32 }}>
    <Text>Every order has a clear path before it reaches the POS or kitchen.</Text>
    <ArrowLink href="#control">See how your team stays in control</ArrowLink>
  </div>
);
