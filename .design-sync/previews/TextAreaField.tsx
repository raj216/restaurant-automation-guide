import { FormCard, TextAreaField } from "@kadmivo/brand-kit";

export const Default = () => (
  <div style={{ background: "var(--paper)", padding: 32 }}>
    <FormCard
      kicker="PHONE-ORDER PREFLIGHT"
      title="Tell us where the phone breaks down."
      note="We use these details only to prepare for this review. No promotional list."
      success={{ title: "Thanks.", text: "Noted." }}
    >
      <TextAreaField label="What happens when the phone gets busy?" name="need" placeholder="Calls ring out during dinner, staff puts people on hold..." required />
    </FormCard>
  </div>
);
