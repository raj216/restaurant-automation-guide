import { FOOTER, NAV, PILOT_CTA } from "./content";
import { Brand } from "./Logo";

export function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer-top">
          <div className="footer-brand">
            <Brand />
            <p>
              <strong>{FOOTER.company}</strong> • {FOOTER.motto}
            </p>
          </div>
          <nav aria-label="Footer">
            <ul className="footer-links">
              {NAV.map(link => (
                <li key={link.href}>
                  <a href={link.href}>{link.label}</a>
                </li>
              ))}
              <li>
                <a href="#pilot">{PILOT_CTA}</a>
              </li>
            </ul>
          </nav>
        </div>
        <p className="wordmark" aria-hidden="true">
          CoHost AI
        </p>
        <p className="legal">{FOOTER.legal}</p>
      </div>
    </footer>
  );
}
