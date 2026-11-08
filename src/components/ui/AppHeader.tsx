"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { Tag } from "@/components/ui/Tag";

interface AppHeaderProps {
  userRole?: string;
  userName?: string | null;
  canManage?: boolean;
}

export function AppHeader({ userRole = "Member", userName, canManage = false }: AppHeaderProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: "Dashboard", href: "/dashboard", active: pathname === "/dashboard" },
    {
      label: userRole === "Member" ? "My Submissions" : "Questions",
      href: "/questions",
      active: pathname.startsWith("/questions"),
    },
    { label: "Quizzes", href: "/quizzes", active: pathname.startsWith("/quizzes") },
    { label: "Leaderboard", href: "/leaderboard", active: pathname.startsWith("/leaderboard") },
    { label: "Alumni", href: "/alumni", active: pathname.startsWith("/alumni") },
    ...(canManage
      ? [{ label: "Admin", href: "/admin", active: pathname.startsWith("/admin") }]
      : []),
  ];

  return (
    <header className="border-b-[3px] border-ink bg-cream sticky top-0 z-40 shadow-[0_2px_0_var(--ink)]">
      <div className="mx-auto flex w-full max-w-[1180px] items-center justify-between px-4 sm:px-6 py-2.5">
        {/* Brand & Crest */}
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center border-2 border-ink bg-cream shadow-[2px_2px_0_var(--ink)] transition-transform group-hover:-rotate-3">
            <Image
              src="/logo.png"
              alt="GEC Quiz Club Logo"
              width={24}
              height={24}
              unoptimized
              className="object-contain"
            />
          </div>
          <div className="flex flex-col">
            <span className="font-display text-sm font-black text-ink uppercase tracking-wider group-hover:text-pink transition-colors leading-tight">
              GEC Quiz Club
            </span>
            <span className="font-mono text-[10px] text-ink/60 -mt-0.5">Council Workspace</span>
          </div>
        </Link>

        {/* Desktop Nav Links with Tactile Active State */}
        <nav className="hidden md:flex items-center gap-1.5 font-body">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-1 text-xs font-bold transition-all ${
                item.active
                  ? "bg-yellow text-ink border-2 border-ink shadow-[2px_2px_0_var(--ink)] font-black -rotate-1"
                  : "text-ink/80 hover:text-ink hover:bg-white/60"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Right Actions: Notification Bell + Profile + Sign Out + Mobile Toggle */}
        <div className="flex items-center gap-2.5">
          <NotificationBell />

          <div className="hidden sm:flex items-center gap-2 border-l-2 border-ink/20 pl-2.5">
            {userName && (
              <span className="font-body text-xs font-bold text-ink truncate max-w-28" title={userName}>
                {userName}
              </span>
            )}
            <Tag tone={userRole === "Admin" ? "pink" : "mint"}>{userRole}</Tag>
          </div>

          <SignOutButton />

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden flex h-8 w-8 items-center justify-center border-2 border-ink bg-white shadow-[2px_2px_0_var(--ink)] hover:bg-yellow active:translate-x-[1px] active:translate-y-[1px] cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            <span className="font-mono text-base font-black text-ink">
              {mobileMenuOpen ? "✕" : "☰"}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <nav className="md:hidden border-t-2 border-ink bg-white p-3 shadow-md flex flex-col gap-1 font-body text-sm font-bold">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`px-3 py-2 border-2 ${
                item.active
                  ? "border-ink bg-yellow text-ink shadow-[2px_2px_0_var(--ink)] font-black"
                  : "border-transparent text-ink hover:bg-cream hover:border-ink/40"
              }`}
            >
              {item.label}
            </Link>
          ))}
          {userName && (
            <div className="mt-2 flex items-center justify-between border-t border-ink/20 pt-2 text-xs text-ink/70">
              <span className="truncate">{userName}</span>
              <Tag tone={userRole === "Admin" ? "pink" : "mint"}>{userRole}</Tag>
            </div>
          )}
        </nav>
      )}
    </header>
  );
}
