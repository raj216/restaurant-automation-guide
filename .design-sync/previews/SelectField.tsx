import { FormCard, FormGrid, SelectField } from "@kadmivo/brand-kit";

export const WithPlaceholderAndDefault = () => (
  <div style={{ background: "var(--paper)", padding: 32 }}>
    <FormCard
      kicker="YOUR SETUP"
      title="Tell us about the counter."
      note="Pick the closest match. Not sure is a fine answer."
      success={{ title: "Thanks.", text: "Noted." }}
    >
      <FormGrid>
        <SelectField label="Current POS" name="pos" placeholder="Select your POS" options={["Toast", "Square", "SpotOn", "Clover", "Other / not sure"]} required />
        <SelectField label="Best way to respond" name="contact_preference" options={["Email me", "Call me", "Either is fine"]} />
      </FormGrid>
    </FormCard>
  </div>
);
