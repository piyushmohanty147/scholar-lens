import Link from "next/link";

// The Scholar Lens mark: a lens ring and handle. Used in the header on every page.
export function Logo() {
  return (
    <Link href="/" className="logo" aria-label="Scholar Lens home">
      <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
        <circle cx="11" cy="11" r="7.5" fill="none" stroke="currentColor" strokeWidth="2.4" />
        <line x1="16.6" y1="16.6" x2="23" y2="23" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      </svg>
      Scholar Lens
    </Link>
  );
}

export function SiteHeader() {
  return (
    <header className="site-header">
      <Logo />
      <nav className="site-nav" aria-label="Main">
        <Link href="/guides/trends">Trend explorer</Link>
        <Link href="/guides">Guides</Link>
        <span className="beta">Beta</span>
      </nav>
    </header>
  );
}
