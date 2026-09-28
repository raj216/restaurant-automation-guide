import { BrandMark } from "../brand/BrandMark";
import { Reveal } from "../motion/Reveal";

export interface SiteFooterProps {
  /** One line under the logo. */
  tagline: string;
  /** Link columns on the right, each { title, links: [{ label, href }] }. */
  columns: { title: string; links: { label: string; href: string }[] }[];
  /** Small print along the bottom rule, one entry per item. */
  legal: string[];
  /** Where the logo links. Default "#top". */
  homeHref?: string;
}

/** A titled column of footer links. */
export type FooterColumn = SiteFooterProps["columns"][number];

/**
 * The near-black site footer: the light logo and a tagline, titled link columns, and a row of small print.
 *
 * The logo draws in when it comes into view.
 */
export function SiteFooter({ tagline, columns, legal, homeHref = "#top" }: SiteFooterProps) {
  return (
    <footer className="site-footer">
      <Reveal className="footer-top" distance={18} atPageEnd>
        <div>
          <a href={homeHref} aria-label="Kadmivo home">
            <BrandMark inverse drawOnView />
          </a>
          <p>{tagline}</p>
        </div>
        <div className="footer-links">
          {columns.map(column => (
            <div key={column.title}>
              <span>{column.title}</span>
              {column.links.map(link => (
                <a key={`${link.href} ${link.label}`} href={link.href}>
                  {link.label}
                </a>
              ))}
            </div>
          ))}
        </div>
      </Reveal>
      <Reveal className="footer-bottom" delay={0.15} distance={0} atPageEnd>
        {legal.map(item => (
          <span key={item}>{item}</span>
        ))}
      </Reveal>
    </footer>
  );
}
