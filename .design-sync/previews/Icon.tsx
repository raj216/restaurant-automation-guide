import { Icon, iconNames } from "@kadmivo/brand-kit";

export const AllIcons = () => (
  <div
    style={{
      background: "var(--paper)",
      padding: 32,
      display: "grid",
      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
      gap: "18px 24px",
    }}
  >
    {iconNames.map(name => (
      <span key={name} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--ink-soft)" }}>
        <Icon name={name} size={20} style={{ color: "var(--terracotta)" }} />
        {name}
      </span>
    ))}
  </div>
);

export const BesideText = () => (
  <div style={{ background: "var(--paper)", padding: 32, display: "grid", gap: 14 }}>
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--terracotta)", fontSize: 14, fontWeight: 700 }}>
      <Icon name="phone" size={16} /> Pickup for Maya
    </span>
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#4d817a", fontSize: 14, fontWeight: 700 }}>
      <Icon name="check" size={16} /> Menu checked
    </span>
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--ink)", fontSize: 14, fontWeight: 700 }}>
      <Icon name="lock" size={16} /> No card numbers over the phone
    </span>
  </div>
);
