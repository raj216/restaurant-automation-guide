import { useEffect, useState } from "react";
import { Button } from "../actions/Button";
import { BrandMark } from "../brand/BrandMark";
import { Icon } from "../brand/Icon";
import { Reveal } from "../motion/Reveal";

export interface SiteHeaderProps {
  /** Section links, each { label, href }. In a menu on phones. */
  links: { label: string; href: string }[];
  /** The outlined call to action on the right, { label, href }. */
  cta?: { label: string; href: string };
  /** Where the logo links. Default "#top". */
  homeHref?: string;
}

/** A labelled link. */
export type NavLink = SiteHeaderProps["links"][number];

/**
 * The sticky site header on frosted night blue: logo, section links and an outlined call to action.
 *
 * The links grow a gold underline on hover. On phones the links and the call
 * to action move into a menu behind a button. Drops in on page load.
 */
export function SiteHeader({ links, cta, homeHref = "#top" }: SiteHeaderProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    const wide = window.matchMedia("(min-width: 901px)");
    const reset = () => wide.matches && setOpen(false);
    window.addEventListener("keydown", close);
    wide.addEventListener("change", reset);
    return () => {
      window.removeEventListener("keydown", close);
      wide.removeEventListener("change", reset);
    };
  }, [open]);

  return (
    <Reveal as="header" className="site-header" playOnLoad delay={0.05} distance={-12}>
      <div className="header-inner">
        <a className="header-home" href={homeHref} aria-label="Kadmivo home">
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
            {cta.label}
          </a>
        )}
        <button
          type="button"
          className="menu-toggle"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen(value => !value)}
        >
          <Icon name={open ? "close" : "menu"} size={24} />
        </button>
      </div>
      <div className="mobile-menu" id="mobile-menu" hidden={!open}>
        <nav aria-label="Menu">
          {links.map(link => (
            <a key={`${link.href} ${link.label}`} href={link.href} onClick={() => setOpen(false)}>
              {link.label}
            </a>
          ))}
        </nav>
        {cta && (
          <Button href={cta.href} onClick={() => setOpen(false)}>
            {cta.label}
          </Button>
        )}
      </div>
    </Reveal>
  );
}
