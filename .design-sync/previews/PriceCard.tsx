import { PriceCard } from "@kadmivo/brand-kit";

export const TrialRange = () => (
  <div style={{ background: "var(--paper-deep)", padding: 32 }}>
    <PriceCard
      label="STARTING TRIAL RANGE"
      price="$750–$1,500"
      detail="Setup + $350–$600/month ongoing management"
      note="Software and phone usage are explained before the trial begins."
    />
  </div>
);

export const WithoutNote = () => (
  <div style={{ background: "var(--paper-deep)", padding: 32 }}>
    <PriceCard label="ONGOING MANAGEMENT" price="$350–$600" detail="Per month, after setup" />
  </div>
);
