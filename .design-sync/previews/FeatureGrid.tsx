import { FeatureGrid } from "@kadmivo/brand-kit";

export const Default = () => (
  <section className="dark-section" style={{ display: "flow-root", paddingBottom: 40 }}>
    <FeatureGrid
      items={[
        { icon: "lock", title: "Your team checks every order", text: "A team member reviews the order before it reaches the POS or is sent to the kitchen." },
        { icon: "shield-check", title: "No card numbers over the phone", text: "Customers can pay at pickup or use your restaurant's secure checkout page." },
        { icon: "user", title: "No guessing", text: "If the assistant is unsure, it sends the question to your team or stops safely." },
      ]}
    />
  </section>
);
