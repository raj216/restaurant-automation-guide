import { BrandMark } from "@kadmivo/brand-kit";

export const Default = () => (
  <div style={{ background: "var(--paper)", padding: 32 }}>
    <a href="#top" aria-label="Kadmivo home">
      <BrandMark />
    </a>
  </div>
);

export const Inverse = () => (
  <div className="dark-section" style={{ padding: 32 }}>
    <a href="#top" aria-label="Kadmivo home">
      <BrandMark inverse />
    </a>
  </div>
);
