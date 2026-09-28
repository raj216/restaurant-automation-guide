import { NoticeBar, SiteHeader } from "@kadmivo/brand-kit";

export const Default = () => (
  <SiteHeader
    links={[
      { label: "The problem", href: "#problem" },
      { label: "How it works", href: "#how-it-works" },
      { label: "Your control", href: "#control" },
      { label: "Trial", href: "#trial" },
    ]}
    cta={{ label: "Book a phone-order review", href: "#contact" }}
  />
);

export const UnderTheNoticeBar = () => (
  <div>
    <NoticeBar
      brand="KADMIVO / JERSEY CITY + NYC"
      message="Restaurant-owned systems · Staff-backed handoff · Supervised trials"
      location="Local availability"
    />
    <SiteHeader
      links={[
        { label: "The problem", href: "#problem" },
        { label: "How it works", href: "#how-it-works" },
        { label: "Your control", href: "#control" },
        { label: "Trial", href: "#trial" },
      ]}
      cta={{ label: "Book a phone-order review", href: "#contact" }}
    />
  </div>
);
