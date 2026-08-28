"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useApp } from "./app-provider";
import { useState } from "react";
import {
  Menu,
  X,
  Globe,
  DollarSign,
  LayoutDashboard,
  Plus,
  Shield,
  LogOut,
} from "lucide-react";

export function Navbar() {
  const { data: session } = useSession();
  const { t, language, setLanguage, currency, setCurrency } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  const role = (session?.user as { role?: string } | undefined)?.role;
  const isAdmin = role === "admin";

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-brand-100">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 text-brand-800 font-semibold text-xl tracking-tight"
          >
            <span className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-white text-sm font-bold">
              A
            </span>
            <span>AInterior</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            {session ? (
              <>
                <Link
                  href="/dashboard"
                  className="text-sm text-brand-600 hover:text-brand-800 transition-colors flex items-center gap-1.5"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  {t("nav.dashboard")}
                </Link>
                <Link
                  href="/design/new"
                  className="text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  {t("nav.newDesign")}
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="text-sm text-brand-600 hover:text-brand-800 transition-colors flex items-center gap-1.5"
                  >
                    <Shield className="w-4 h-4" />
                    {t("nav.admin")}
                  </Link>
                )}
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm text-brand-600 hover:text-brand-800 transition-colors"
                >
                  {t("nav.login")}
                </Link>
                <Link
                  href="/signup"
                  className="text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 px-4 py-2 rounded-lg transition-colors"
                >
                  {t("nav.signup")}
                </Link>
              </>
            )}

            {/* Language toggle */}
            <button
              onClick={() => setLanguage(language === "en" ? "ar" : "en")}
              className="text-brand-500 hover:text-brand-700 transition-colors p-1.5 rounded-md"
              title="Toggle language"
            >
              <Globe className="w-4 h-4" />
            </button>

            {/* Currency toggle */}
            <button
              onClick={() => setCurrency(currency === "AED" ? "USD" : "AED")}
              className="text-xs font-medium text-brand-500 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-2.5 py-1 rounded-md transition-colors"
            >
              {currency}
            </button>

            {session && (
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="text-brand-400 hover:text-brand-600 transition-colors p-1.5"
                title={t("nav.logout")}
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden p-2 text-brand-600"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden pb-4 border-t border-brand-100 pt-3 space-y-3">
            {session ? (
              <>
                <Link
                  href="/dashboard"
                  className="block text-sm text-brand-600 py-1"
                  onClick={() => setMobileOpen(false)}
                >
                  {t("nav.dashboard")}
                </Link>
                <Link
                  href="/design/new"
                  className="block text-sm font-medium text-brand-800 py-1"
                  onClick={() => setMobileOpen(false)}
                >
                  {t("nav.newDesign")}
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="block text-sm text-brand-600 py-1"
                    onClick={() => setMobileOpen(false)}
                  >
                    {t("nav.admin")}
                  </Link>
                )}
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="block text-sm text-brand-500 py-1"
                >
                  {t("nav.logout")}
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="block text-sm text-brand-600 py-1"
                  onClick={() => setMobileOpen(false)}
                >
                  {t("nav.login")}
                </Link>
                <Link
                  href="/signup"
                  className="block text-sm font-medium text-brand-800 py-1"
                  onClick={() => setMobileOpen(false)}
                >
                  {t("nav.signup")}
                </Link>
              </>
            )}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setLanguage(language === "en" ? "ar" : "en")}
                className="text-xs text-brand-500 bg-brand-50 px-3 py-1.5 rounded-md flex items-center gap-1"
              >
                <Globe className="w-3 h-3" />
                {language === "en" ? "العربية" : "English"}
              </button>
              <button
                onClick={() => setCurrency(currency === "AED" ? "USD" : "AED")}
                className="text-xs text-brand-500 bg-brand-50 px-3 py-1.5 rounded-md flex items-center gap-1"
              >
                <DollarSign className="w-3 h-3" />
                {currency === "AED" ? "USD" : "AED"}
              </button>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
