import { Timeline } from "@kadmivo/brand-kit";

export const Default = () => (
  <section style={{ background: "var(--paper-deep)", display: "flow-root", paddingBottom: 40 }}>
    <Timeline
      items={[
        { label: "ONE RESTAURANT", title: "One starting schedule", text: "Begin with one location and specific hours when a team member is available to check orders." },
        { label: "MEASURE RESULTS", title: "What we track", text: "Orders completed, team review time, corrections, transfers, and accepted or cancelled outcomes." },
        { label: "THE GOAL", title: "Prove or stop", text: "Keep the workflow, adjust it, or stop based on what it does for your restaurant." },
        { label: "THE STANDARD", title: "Completed orders", text: "We measure completed restaurant orders—not just calls handled by software." },
      ]}
    />
  </section>
);
