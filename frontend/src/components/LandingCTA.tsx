"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";

export function HeroCTA() {
  const { isSignedIn } = useAuth();

  if (isSignedIn) {
    return (
      <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 animate-fade-in-up [animation-delay:0.2s]">
        <Link
          href="/dashboard"
          id="hero-dashboard-btn"
          className="rounded-xl bg-plum-red px-7 py-3.5 text-sm font-bold text-white shadow-xl shadow-plum-red/30 transition-all hover:bg-plum-red-hover hover:scale-105"
        >
          Go to Dashboard →
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 animate-fade-in-up [animation-delay:0.2s]">
      <Link
        href="/sign-up"
        id="hero-get-started-btn"
        className="rounded-xl bg-plum-red px-7 py-3.5 text-sm font-bold text-white shadow-xl shadow-plum-red/30 transition-all hover:bg-plum-red-hover hover:shadow-plum-red/50 hover:scale-105"
      >
        Get Started — It&apos;s Free
      </Link>
      <Link
        href="/sign-in"
        className="rounded-xl border border-white/15 px-7 py-3.5 text-sm font-medium text-white/75 transition-all hover:border-white/30 hover:text-white"
      >
        Sign In
      </Link>
    </div>
  );
}

export function BannerCTA() {
  const { isSignedIn } = useAuth();

  if (isSignedIn) {
    return (
      <Link
        href="/dashboard"
        className="inline-block rounded-xl bg-plum-red px-8 py-3.5 text-sm font-bold text-white shadow-xl shadow-plum-red/30 transition-all hover:bg-plum-red-hover hover:scale-105"
      >
        Go to Dashboard →
      </Link>
    );
  }

  return (
    <Link
      href="/sign-up"
      className="inline-block rounded-xl bg-plum-red px-8 py-3.5 text-sm font-bold text-white shadow-xl shadow-plum-red/30 transition-all hover:bg-plum-red-hover hover:scale-105"
    >
      Submit Your First Claim →
    </Link>
  );
}
