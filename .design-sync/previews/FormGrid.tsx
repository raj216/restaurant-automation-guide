import { Field, FormCard, FormGrid } from "@kadmivo/brand-kit";

export const TwoColumns = () => (
  <div style={{ background: "var(--paper)", padding: 32 }}>
    <FormCard
      kicker="RESTAURANT DETAILS"
      title="Where should we start?"
      note="Rough numbers are fine. We confirm everything on the call."
      success={{ title: "Saved.", text: "We have your restaurant details." }}
    >
      <FormGrid>
        <Field label="Restaurant name" name="restaurant" placeholder="Rivera Kitchen" required />
        <Field label="City / neighborhood" name="location" placeholder="Jersey City, NJ" required />
        <Field label="Busiest night" name="night" placeholder="Friday" />
        <Field label="Calls per night" name="calls" type="number" placeholder="40" hint="(estimate)" />
      </FormGrid>
    </FormCard>
  </div>
);
