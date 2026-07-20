import { Link } from "@tanstack/react-router";
import winstreamLogo from "@/assets/winstream-logo.png.asset.json";

const links = [
  { to: "/features", label: "Features" },
  { to: "/pricing", label: "Pricing" },
  { to: "/blog", label: "Blog" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
] as const;

export function SiteNav() {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[#04121a]/80 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link to="/" className="flex items-center gap-2 text-white">
          <img src={winstreamLogo.url} alt="WinStream SA" className="h-7 w-7" />
          <span className="font-bold tracking-tight">WinStream SA</span>
        </Link>
        <div className="hidden items-center gap-6 md:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-sm text-white/70 transition-colors hover:text-white"
              activeProps={{ className: "text-sm text-white" }}
            >
              {l.label}
            </Link>
          ))}
        </div>
        <Link
          to="/auth"
          className="rounded-lg bg-white px-4 py-1.5 text-sm font-semibold text-[#04121a] hover:bg-white/90"
        >
          Sign in
        </Link>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#04121a] text-white/60">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-xs sm:flex-row">
        <span>© {new Date().getFullYear()} WinStream SA. All rights reserved.</span>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <Link to="/features" className="hover:text-white">Features</Link>
          <Link to="/pricing" className="hover:text-white">Pricing</Link>
          <Link to="/blog" className="hover:text-white">Blog</Link>
          <Link to="/reviews" className="hover:text-white">Reviews</Link>
          <Link to="/about" className="hover:text-white">About</Link>
          <Link to="/contact" className="hover:text-white">Contact</Link>
          <Link to="/trust" className="hover:text-white">Trust</Link>
          <Link to="/terms" className="hover:text-white">Terms</Link>
          <Link to="/refund" className="hover:text-white">Refund</Link>
          <Link to="/privacy" className="hover:text-white">Privacy</Link>
        </div>

      </div>
    </footer>
  );
}
