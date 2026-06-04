"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth, UserButton } from "@clerk/nextjs";

export default function Navbar() {
  const pathname = usePathname();
  const { isSignedIn } = useAuth();
  const isDashboard = pathname?.startsWith("/dashboard");

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/8 bg-plum-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-2xl font-black tracking-tight text-plum-red transition-opacity group-hover:opacity-80">
            plum
          </span>
          {isDashboard && (
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-0.5 text-xs font-medium text-white/50 border border-white/10">
              Claims Portal
            </span>
          )}
        </Link>

        {/* Nav links (public page only) */}
        {!isDashboard && (
          <nav className="hidden md:flex items-center gap-6 text-sm text-white/60">
            <span className="text-white/30 select-none">|</span>
            <span className="hover:text-white/90 cursor-default transition-colors">
              Product
            </span>
            <span className="text-white/30 select-none">|</span>
            <span className="hover:text-white/90 cursor-default transition-colors">
              Experience
            </span>
            <span className="text-white/30 select-none">|</span>
            <span className="hover:text-white/90 cursor-default transition-colors">
              Solutions
            </span>
            <span className="text-white/30 select-none">|</span>
            <span className="hover:text-white/90 cursor-default transition-colors">
              Company
            </span>
          </nav>
        )}

        {/* Auth controls */}
        <div className="flex items-center gap-3">
          {!isSignedIn ? (
            <>
              <Link
                href="/sign-in"
                className="rounded-lg border border-white/20 px-4 py-1.5 text-sm font-medium text-white/80 transition-all hover:border-white/40 hover:text-white hover:bg-white/5"
              >
                Log In
              </Link>
              <Link
                href="/sign-up"
                className="rounded-lg bg-plum-red px-4 py-1.5 text-sm font-semibold text-white shadow-lg shadow-plum-red/25 transition-all hover:bg-plum-red-hover hover:shadow-plum-red/40"
              >
                Get Started
              </Link>
            </>
          ) : (
            <>
              {!isDashboard && (
                <Link
                  href="/dashboard"
                  className="rounded-lg bg-plum-red px-4 py-1.5 text-sm font-semibold text-white shadow-lg shadow-plum-red/25 transition-all hover:bg-plum-red-hover"
                >
                  Dashboard
                </Link>
              )}
              <Link
                href="/admin"
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                  pathname?.startsWith("/admin")
                    ? "border-plum-purple/40 bg-plum-purple/15 text-plum-purple-light"
                    : "border-white/10 text-white/50 hover:border-plum-purple/30 hover:text-plum-purple-light hover:bg-plum-purple/5"
                }`}
              >
                🛡️ Admin
              </Link>
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "w-8 h-8 ring-2 ring-white/20",
                  },
                }}
              />
            </>
          )}
        </div>
      </div>
    </header>
  );
}
