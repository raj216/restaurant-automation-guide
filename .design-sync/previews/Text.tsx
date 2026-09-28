import { Eyebrow, Heading, Text } from "@kadmivo/brand-kit";

export const Lead = () => (
  <div style={{ background: "var(--paper)", padding: 32 }}>
    <Text variant="lead">Calls go unanswered. Staff put callers on hold. Special requests get misunderstood. Future pickup orders get lost in the rush.</Text>
  </div>
);

export const Body = () => (
  <div style={{ background: "var(--paper)", padding: 32 }}>
    <Text>Those missed calls become missed orders and frustrated customers. Kadmivo gives routine phone orders a controlled path without taking the final decision away from your team.</Text>
  </div>
);

export const HeroLedeAndEmphasis = () => (
  <div style={{ background: "var(--paper)", padding: 32 }}>
    <Text variant="lede">Kadmivo answers routine restaurant calls, checks each order against the menu you approve, and gives your team an order draft to check.</Text>
    <Text variant="emphasis">Your team checks the order before it reaches the POS or kitchen.</Text>
  </div>
);

export const SectionIntroOnDark = () => (
  <div className="dark-section" style={{ padding: 32 }}>
    <Eyebrow>See if your restaurant is a fit</Eyebrow>
    <Heading>{"Let's look at the calls your team is missing."}</Heading>
    <Text>You do not need to commit to anything. We will first determine whether the workflow fits your restaurant.</Text>
  </div>
);
