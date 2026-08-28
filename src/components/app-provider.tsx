"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { Currency, Language } from "@/lib/types";
import { t as translate } from "@/lib/i18n";

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

export function AppProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("en");
  const [currency, setCurrency] = useState<Currency>("AED");

  const t = useCallback(
    (key: string) => translate(key, language),
    [language]
  );

  const dir = language === "ar" ? "rtl" : "ltr";
  const isRTL = language === "ar";

  return (
    <AppContext.Provider
      value={{ language, setLanguage, currency, setCurrency, t, dir, isRTL }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
