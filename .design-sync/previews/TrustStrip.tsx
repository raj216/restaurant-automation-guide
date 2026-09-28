import { TrustStrip } from "@kadmivo/brand-kit";

export const Default = () => (
  <div style={{ background: "var(--paper)", padding: 32 }}>
    <TrustStrip
      label="Kadmivo safeguards"
      items={[
        { icon: "clipboard-check", label: "Menu checked first" },
        { icon: "user", label: "Team member checks every order" },
        { icon: "lock", label: "No card numbers over the phone" },
      ]}
    />
  </div>
);

export const TwoItems = () => (
  <div style={{ background: "var(--paper)", padding: 32 }}>
    <TrustStrip
      label="Trial terms"
      items={[
        { icon: "clock", label: "90-day supervised trial" },
        { icon: "map-pin", label: "One location to start" },
      ]}
    />
  </div>
);
