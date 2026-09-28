import { Field, FormCard, FormGrid } from "@kadmivo/brand-kit";

export const RequiredAndOptional = () => (
  <div style={{ background: "var(--paper)", padding: 32 }}>
    <FormCard
      kicker="CONTACT"
      title="How do we reach you?"
      note="We only use these to follow up on your review."
      success={{ title: "Thanks.", text: "We will be in touch." }}
    >
      <FormGrid>
        <Field label="Email" name="email" type="email" placeholder="jamie@restaurant.com" required />
        <Field label="Phone" name="phone" type="tel" placeholder="(201) 555-0148" hint="(optional)" />
      </FormGrid>
    </FormCard>
  </div>
);

export const SingleField = () => (
  <div style={{ background: "var(--paper)", padding: 32 }}>
    <FormCard
      kicker="QUICK QUESTION"
      title="Which POS do you run?"
      note="It tells us how the order draft reaches your kitchen."
      success={{ title: "Thanks.", text: "Noted." }}
    >
      <Field label="POS name" name="pos" placeholder="Toast" required />
    </FormCard>
  </div>
);
