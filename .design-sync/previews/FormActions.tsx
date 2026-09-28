import { Button, FormActions, FormCard, SelectField } from "@kadmivo/brand-kit";

export const SelectAndSubmit = () => (
  <div style={{ background: "var(--paper)", padding: 32 }}>
    <FormCard kicker="ALMOST DONE" title="How should we reply?" note="We answer within one business day." success={{ title: "Thanks.", text: "Noted." }}>
      <FormActions>
        <SelectField label="Best way to respond" name="contact_preference" options={["Email me", "Call me", "Either is fine"]} />
        <Button type="submit">Request my phone-order review</Button>
      </FormActions>
    </FormCard>
  </div>
);

export const SubmitOnly = () => (
  <div style={{ background: "var(--paper)", padding: 32 }}>
    <FormCard kicker="ALMOST DONE" title="Ready when you are." note="We will reply with one practical next step." success={{ title: "Thanks.", text: "Noted." }}>
      <FormActions>
        <Button type="submit">Send request</Button>
      </FormActions>
    </FormCard>
  </div>
);
