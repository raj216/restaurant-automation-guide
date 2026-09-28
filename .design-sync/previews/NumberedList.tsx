import { NumberedList } from "@kadmivo/brand-kit";

export const Default = () => (
  <div style={{ background: "var(--paper)", padding: "1px 32px 32px" }}>
    <NumberedList
      items={[
        { title: "More calls answered", text: "Give routine callers a path during the hours you choose." },
        { title: "Fewer order surprises", text: "Check menu items, prices, special requests, and pickup details before your team approves the order." },
        { title: "One clear order record", text: "See what the customer requested, what your team checked, and what reached the POS." },
      ]}
    />
  </div>
);
