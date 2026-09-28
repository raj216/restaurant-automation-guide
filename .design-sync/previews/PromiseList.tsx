import { PromiseList } from "@kadmivo/brand-kit";

export const Default = () => (
  <div className="dark-section" style={{ padding: "1px 32px 32px" }}>
    <PromiseList
      items={[
        { icon: "clock", label: "20 minutes" },
        { icon: "map-pin", label: "One restaurant" },
        { icon: "arrow-right", label: "One practical next step" },
      ]}
    />
  </div>
);
