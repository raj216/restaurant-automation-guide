import { OrderCard } from "@kadmivo/brand-kit";

export const PendingReview = () => (
  <div style={{ background: "var(--paper)", padding: "40px 32px" }}>
    <OrderCard
      kicker="ASSISTED ORDER · SAMPLE"
      notice="NOT A LIVE ORDER"
      label="CUSTOMER CONFIRMED"
      title="Order draft K-021"
      badge="Pending review"
      customer="Pickup for Maya"
      pickup="Today · 8:20 PM"
      time="7:42 PM"
      items={[
        { name: "1 × Rigatoni", note: "extra sauce · no cheese", price: "$19.00" },
        { name: "1 × Garlic knots", note: "sauce on the side", price: "$8.50" },
      ]}
      steps={[
        { label: "Customer confirmed", state: "done" },
        { label: "Menu checked", state: "done" },
        { label: "Your team checks the order", state: "current" },
        { label: "Reaches POS", state: "pending" },
      ]}
      footer="The kitchen follows the POS ticket—not an AI transcript."
    />
  </div>
);

export const InTheHeroVisual = () => (
  <div style={{ background: "var(--paper)", padding: "24px 32px" }}>
    <div className="hero-visual" aria-label="Sample order draft awaiting team review">
      <OrderCard
        kicker="ASSISTED ORDER · SAMPLE"
        notice="NOT A LIVE ORDER"
        label="CUSTOMER CONFIRMED"
        title="Order draft K-034"
        badge="Pending review"
        customer="Delivery for Andre"
        pickup="Today · 7:05 PM"
        time="6:31 PM"
        items={[
          { name: "2 × Margherita pizza", note: "well done · cut in squares", price: "$36.00" },
          { name: "1 × Caesar salad", note: "dressing on the side", price: "$12.00" },
          { name: "1 × Tiramisu", price: "$9.00" },
        ]}
        steps={[
          { label: "Customer confirmed", state: "done" },
          { label: "Menu checked", state: "done" },
          { label: "Your team checks the order", state: "current" },
          { label: "Reaches POS", state: "pending" },
        ]}
        footer="The kitchen follows the POS ticket—not an AI transcript."
      />
    </div>
  </div>
);

export const SentToPos = () => (
  <div style={{ background: "var(--paper)", padding: "40px 32px" }}>
    <OrderCard
      kicker="ASSISTED ORDER · SAMPLE"
      notice="NOT A LIVE ORDER"
      label="TEAM APPROVED"
      title="Order draft K-022"
      badge="Ready 6:45 PM"
      customer="Pickup for Priya"
      pickup="Today · 6:45 PM"
      time="6:12 PM"
      items={[{ name: "1 × Chicken parm", note: "extra crispy", price: "$21.00" }]}
      steps={[
        { label: "Customer confirmed", state: "done" },
        { label: "Menu checked", state: "done" },
        { label: "Your team checked the order", state: "done" },
        { label: "Reached POS", state: "done" },
      ]}
    />
  </div>
);
