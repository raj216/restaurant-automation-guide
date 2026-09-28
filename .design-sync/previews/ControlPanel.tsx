import { ControlPanel } from "@kadmivo/brand-kit";

export const SafeHandoff = () => (
  <div className="dark-section" style={{ padding: 32 }}>
    <ControlPanel
      label="HOW THE SAFE HANDOFF WORKS"
      status="Team review stays visible"
      description="Every order has a clear path before it reaches the POS or kitchen."
      rows={[
        { label: "Customer", value: "Confirms order" },
        { label: "Menu", value: "Checked first" },
        { label: "Your team", value: "Checks the order" },
        { label: "Kitchen", value: "Follows the POS" },
      ]}
    />
  </div>
);

export const TonightsCoverage = () => (
  <div className="dark-section" style={{ padding: 32 }}>
    <ControlPanel
      label="TONIGHT'S PHONE COVERAGE"
      status="Assistant answering 5–9 PM"
      description="A team member is on shift to check every order draft."
      rows={[
        { label: "Orders checked", value: "14" },
        { label: "Changed by your team", value: "3" },
        { label: "Transferred to staff", value: "2" },
        { label: "Average review", value: "38 seconds" },
      ]}
    />
  </div>
);
