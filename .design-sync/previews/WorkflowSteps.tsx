import { WorkflowSteps } from "@kadmivo/brand-kit";

export const Default = () => (
  <div style={{ background: "var(--paper)", padding: "32px 32px 32px 56px" }}>
    <WorkflowSteps
      steps={[
        { icon: "phone", title: "The call is answered", text: "The assistant identifies itself and handles routine ordering questions during the hours you choose." },
        { icon: "clipboard-check", title: "The menu is checked", text: "Items, prices, special requests, hours, and available options are checked against the menu you approve." },
        { icon: "check-circle", title: "The order is repeated", text: "The customer hears the complete order and confirms it before an order draft is created." },
        { icon: "hand", title: "Your team checks it", text: "A team member accepts, changes, rejects, or transfers the order before it reaches the POS." },
      ]}
    />
  </div>
);
