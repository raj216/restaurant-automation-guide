import { ActionRow, Button, TextLink } from "@kadmivo/brand-kit";

export const ButtonAndLink = () => (
  <div style={{ background: "var(--paper)", padding: "1px 32px" }}>
    <ActionRow>
      <Button href="#how-it-works">See how it works</Button>
      <TextLink href="#contact">Book a phone-order review</TextLink>
    </ActionRow>
  </div>
);
