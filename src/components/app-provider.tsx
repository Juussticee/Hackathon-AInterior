"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type { Currency, Language } from "@/lib/types";
import { t as translate } from "@/lib/i18n";
import { ToastProvider } from "./toast";

interface AppContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  currency: Currency;
  setCurrency: (cur: Currency) => void;
  t: (key: string) => string;
  dir: "ltr" | "rtl";
  isRTL: boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

const LANG_KEY = "ainterior_language";
const CURR_KEY = "ainterior_currency";

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const val = localStorage.getItem(key);
    return val ? (val as T) : fallback;
  } catch {
    return fallback;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() =>
    readStorage<Language>(LANG_KEY, "en")
  );
  const [currency, setCurrencyState] = useState<Currency>(() =>
    readStorage<Currency>(CURR_KEY, "AED")
  );

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try { localStorage.setItem(LANG_KEY, lang); } catch { /* ignore */ }
  }, []);

  const setCurrency = useCallback((cur: Currency) => {
    setCurrencyState(cur);
    try { localStorage.setItem(CURR_KEY, cur); } catch { /* ignore */ }
  }, []);

  const t = useCallback(
    (key: string) => translate(key, language),
    [language]
  );

  const dir = language === "ar" ? "rtl" : "ltr";
  const isRTL = language === "ar";

  // Sync dir attribute on <html> for RTL support
  useEffect(() => {
    document.documentElement.setAttribute("dir", dir);
    document.documentElement.setAttribute("lang", language);
  }, [dir, language]);

  return (
    <AppContext.Provider
      value={{ language, setLanguage, currency, setCurrency, t, dir, isRTL }}
    >
      <ToastProvider>
        {children}
      </ToastProvider>
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
