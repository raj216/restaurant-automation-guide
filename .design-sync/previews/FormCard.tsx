import { Button, Field, FormActions, FormCard, FormGrid, SelectField, TextAreaField } from "@kadmivo/brand-kit";

export const PhoneOrderReview = () => (
  <div className="dark-section" style={{ padding: 32 }}>
    <FormCard
      kicker="PHONE-ORDER PREFLIGHT"
      title="Tell us where the phone breaks down."
      note="We use these details only to prepare for this review. No promotional list."
      success={{
        title: "Request received.",
        text: "We will review your restaurant details and follow up with the next practical step.",
        backLabel: "Back to the top",
        backHref: "#top",
      }}
    >
      <FormGrid>
        <Field label="Your name" name="name" placeholder="Jamie Rivera" required />
        <Field label="Restaurant name" name="restaurant" placeholder="Rivera Kitchen" required />
        <Field label="Email" name="email" type="email" placeholder="jamie@restaurant.com" required />
        <Field label="Phone" name="phone" type="tel" placeholder="(201) 555-0148" hint="(optional)" />
        <Field label="City / neighborhood" name="location" placeholder="Jersey City, NJ" required />
        <SelectField label="Current POS" name="pos" placeholder="Select your POS" options={["Toast", "Square", "SpotOn", "Clover", "Other / not sure"]} required />
      </FormGrid>
      <TextAreaField label="What happens when the phone gets busy?" name="need" placeholder="Calls ring out during dinner, staff puts people on hold..." required />
      <FormActions>
        <SelectField label="Best way to respond" name="contact_preference" options={["Email me", "Call me", "Either is fine"]} />
        <Button type="submit">Request my phone-order review</Button>
      </FormActions>
    </FormCard>
  </div>
);

export const CallbackRequest = () => (
  <div style={{ background: "var(--paper)", padding: 32 }}>
    <FormCard
      kicker="CALL ME BACK"
      title="Pick a time that suits the kitchen."
      note="One call, about 20 minutes. No sales list."
      success={{ title: "We'll call you.", text: "Expect a call at the time you picked." }}
    >
      <FormGrid>
        <Field label="Your name" name="name" placeholder="Jamie Rivera" required />
        <Field label="Phone" name="phone" type="tel" placeholder="(201) 555-0148" required />
      </FormGrid>
      <FormActions>
        <SelectField label="Best time" name="time" options={["Before lunch", "Mid-afternoon", "After close"]} />
        <Button type="submit">Request a call</Button>
      </FormActions>
    </FormCard>
  </div>
);
