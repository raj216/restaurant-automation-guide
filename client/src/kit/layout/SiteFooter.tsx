import { m } from "framer-motion";
import { BrandMark } from "../brand/BrandMark";
import { EASE, useMotionKit } from "../motion/core";
import { Reveal } from "../motion/Reveal";
import { at } from "../utils";

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

const WORDMARK = "Kadmivo";

/**
 * The site footer: logo and tagline, titled link columns, a giant outlined wordmark and a row of small print.
 *
 * The wordmark's letters rise in one by one when it comes into view.
 */
export function SiteFooter({ tagline, columns, legal, homeHref = "#top" }: SiteFooterProps) {
  const { reduce } = useMotionKit();
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <Reveal className="footer-top" distance={18} atPageEnd>
          <div className="footer-brand">
            <a href={homeHref} aria-label="Kadmivo home" className="header-home">
              <BrandMark drawOnView />
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
        <div className="footer-wordmark" aria-hidden="true">
          {WORDMARK.split("").map((letter, i) =>
            reduce ? (
              <span key={i}>{letter}</span>
            ) : (
              <m.span
                key={i}
                initial={{ y: "70%", opacity: 0 }}
                whileInView={{ y: "0%", opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1, ease: EASE, delay: at(0.06 * i) }}
              >
                {letter}
              </m.span>
            )
          )}
        </div>
        <Reveal className="footer-bottom" delay={0.15} distance={0} atPageEnd>
          {legal.map(item => (
            <span key={item}>{item}</span>
          ))}
        </Reveal>
      </div>
    </footer>
  );
}
