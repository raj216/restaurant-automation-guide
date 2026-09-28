import { SiteFooter } from "@kadmivo/brand-kit";

export const Default = () => (
  <SiteFooter
    tagline="Human-controlled phone-order recovery for independent restaurants."
    columns={[
      {
        title: "Explore",
        links: [
          { label: "The problem", href: "#problem" },
          { label: "How it works", href: "#how-it-works" },
          { label: "Supervised trial", href: "#trial" },
          { label: "Phone-order review", href: "#contact" },
        ],
      },
      {
        title: "Built around",
        links: [
          { label: "Team control", href: "#control" },
          { label: "Order recovery", href: "#problem" },
          { label: "Local availability", href: "#contact" },
        ],
      },
    ]}
    legal={["Working brand · preliminary name screening only", "Jersey City + New York City", "© 2026 Kadmivo"]}
  />
);
