import { BrandMark } from "../brand/BrandMark";
import { Icon } from "../brand/Icon";
import { Reveal } from "../motion/Reveal";

export interface SiteHeaderProps {
  /** Section links in the middle, each { label, href }. Hidden on phones. */
  links: { label: string; href: string }[];
  /** The dark call to action on the right, { label, href }. */
  cta?: { label: string; href: string };
  /** Where the logo links. Default "#top". */
  homeHref?: string;
}

/** A labelled link. */
export type NavLink = SiteHeaderProps["links"][number];

/**
 * The sticky site header on frosted paper: logo, section links and a dark call to action.
 *
 * The links underline on hover. Drops in on page load.
 */
export function SiteHeader({ links, cta, homeHref = "#top" }: SiteHeaderProps) {
  return (
    <Reveal as="header" className="site-header" playOnLoad delay={0.05} distance={-12}>
      <a href={homeHref} aria-label="Kadmivo home">
        <BrandMark />
      </a>
      <nav className="desktop-nav" aria-label="Primary navigation">
        {links.map(link => (
          <a key={`${link.href} ${link.label}`} href={link.href}>
            {link.label}
          </a>
        ))}
      </nav>
      {cta && (
        <a className="nav-cta" href={cta.href}>
          {cta.label} <Icon name="arrow-right" size={16} />
        </a>
      )}
    </Reveal>
  );
}
