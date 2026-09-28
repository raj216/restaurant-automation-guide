import { DrawIcon } from "@kadmivo/brand-kit";

export const OnPaper = () => (
  <div style={{ background: "var(--paper)", padding: 32, display: "flex", gap: 28, color: "var(--terracotta)" }}>
    <DrawIcon name="phone" />
    <DrawIcon name="clipboard-check" />
    <DrawIcon name="check-circle" />
    <DrawIcon name="hand" />
  </div>
);

export const OnDark = () => (
  <div className="dark-section" style={{ padding: 32, display: "flex", gap: 28, color: "#d7a18a" }}>
    <DrawIcon name="lock" />
    <DrawIcon name="shield-check" />
    <DrawIcon name="user" />
  </div>
);
