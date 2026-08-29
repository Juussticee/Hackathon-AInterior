"use client";

import Link from "next/link";
import { useApp } from "@/components/app-provider";
import {
  Camera,
  Palette,
  Sparkles,
  ShoppingBag,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

export default function LandingPage() {
  const { t } = useApp();

  return (
    <div className="flex flex-col">
      {/* ---- HERO ---- */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-white to-white">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-100/60 rounded-full blur-3xl" />
          <div className="absolute top-20 -left-20 w-72 h-72 bg-brand-200/40 rounded-full blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-36">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-brand-100 text-brand-700 text-xs font-medium px-3 py-1.5 rounded-full mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              AI-Powered Interior Design
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-brand-900 leading-tight">
              {t("landing.hero.title")}
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-brand-500 leading-relaxed max-w-2xl mx-auto">
              {t("landing.hero.subtitle")}
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/design/new"
                className="inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-medium px-8 py-3.5 rounded-xl transition-all hover:shadow-lg hover:shadow-brand-200 text-base"
              >
                {t("landing.hero.cta")}
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center gap-2 bg-white hover:bg-brand-50 text-brand-700 font-medium px-8 py-3.5 rounded-xl border border-brand-200 transition-all text-base"
              >
                {t("landing.hero.secondary")}
              </a>
            </div>
          </div>

          {/* Hero Image */}
          <div className="mt-16 sm:mt-20 max-w-5xl mx-auto">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-brand-200/50 aspect-[16/9]">
              <img
                src="https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1400&q=80"
                alt="Beautiful Japandi interior"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1400&q=80";
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-brand-900/30 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <div className="bg-white/90 backdrop-blur-sm rounded-xl px-5 py-3 inline-flex items-center gap-3">
                  <div className="flex -space-x-2">
                    <div className="w-6 h-6 rounded-full bg-brand-200 border-2 border-white" />
                    <div className="w-6 h-6 rounded-full bg-brand-400 border-2 border-white" />
                    <div className="w-6 h-6 rounded-full bg-brand-600 border-2 border-white" />
                  </div>
                  <span className="text-sm text-brand-700 font-medium">
                    Real products from Danube Home, Home Centre & PAN Emirates
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- HOW IT WORKS ---- */}
      <section id="how-it-works" className="py-20 sm:py-28 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-brand-900">
              {t("landing.how.title")}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 stagger-children">
            {[
              {
                icon: Camera,
                title: t("landing.how.step1.title"),
                desc: t("landing.how.step1.desc"),
                img: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&q=80",
              },
              {
                icon: Palette,
                title: t("landing.how.step2.title"),
                desc: t("landing.how.step2.desc"),
                img: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=400&q=80",
              },
              {
                icon: Sparkles,
                title: t("landing.how.step3.title"),
                desc: t("landing.how.step3.desc"),
                img: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=400&q=80",
              },
              {
                icon: ShoppingBag,
                title: t("landing.how.step4.title"),
                desc: t("landing.how.step4.desc"),
                img: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80",
              },
            ].map((step, i) => (
              <div key={i} className="group">
                <div className="relative aspect-[4/3] rounded-xl overflow-hidden mb-4">
                  <img
                    src={step.img}
                    alt={step.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&q=80";
                    }}
                  />
                  <div className="absolute top-3 left-3 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-brand-700 font-bold text-sm">
                    {i + 1}
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <step.icon className="w-4 h-4 text-brand-500" />
                  <h3 className="font-semibold text-brand-800">{step.title}</h3>
                </div>
                <p className="text-sm text-brand-500 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- STYLES ---- */}
      <section className="py-20 sm:py-28 bg-brand-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-brand-900">
              {t("landing.styles.title")}
            </h2>
            <p className="mt-3 text-brand-500">
              {t("landing.styles.subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {[
              {
                name: t("wizard.style.minimalist"),
                desc: "Clean lines, neutral tones, and purposeful pieces. Every item earns its place.",
                img: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=600&q=80",
                colors: ["#FFFFFF", "#F5F5F5", "#212121", "#616161"],
              },
              {
                name: t("wizard.style.japandi"),
                desc: "Japanese wabi-sabi meets Scandinavian hygge. Natural materials and serene simplicity.",
                img: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=600&q=80",
                colors: ["#F5F0EB", "#D4C5B5", "#8B7355", "#4A4035"],
              },
            ].map((style, i) => (
              <div
                key={i}
                className="group relative rounded-2xl overflow-hidden aspect-[4/5] cursor-pointer"
              >
                <img
                  src={style.img}
                  alt={style.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&q=80";
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-900/80 via-brand-900/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h3 className="text-2xl font-bold text-white mb-2">
                    {style.name}
                  </h3>
                  <p className="text-white/80 text-sm mb-3">{style.desc}</p>
                  <div className="flex gap-2">
                    {style.colors.map((color, j) => (
                      <div
                        key={j}
                        className="w-6 h-6 rounded-full border-2 border-white/50"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- TRUST / FEATURES ---- */}
      <section className="py-20 sm:py-28 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-brand-900">
              Real Products. Real Prices. Real Links.
            </h2>
            <p className="mt-4 text-brand-500 text-lg">
              Every item in your design is a real product you can buy directly
              from approved UAE retailers.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              {
                title: "Approved Catalog",
                desc: "Only furniture from Home Centre, PAN Emirates, and Danube Home.",
              },
              {
                title: "Direct Purchase Links",
                desc: "Every product card links directly to the retailer's product page.",
              },
              {
                title: "Budget-Aware AI",
                desc: "Set your budget in AED and the AI stays within it.",
              },
            ].map((feat, i) => (
              <div key={i} className="text-center">
                <div className="w-12 h-12 bg-brand-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-6 h-6 text-brand-600" />
                </div>
                <h3 className="font-semibold text-brand-800 mb-2">
                  {feat.title}
                </h3>
                <p className="text-sm text-brand-500">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- CTA ---- */}
      <section className="py-20 sm:py-28 bg-brand-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            {t("landing.cta.title")}
          </h2>
          <p className="mt-4 text-brand-300 text-lg max-w-xl mx-auto">
            {t("landing.cta.subtitle")}
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-flex items-center gap-2 bg-white text-brand-800 font-medium px-8 py-3.5 rounded-xl hover:bg-brand-50 transition-all text-base"
          >
            {t("landing.hero.cta")}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ---- FOOTER ---- */}
      <footer className="bg-brand-900 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 text-brand-400 text-sm">
            <span className="w-6 h-6 rounded-md bg-brand-700 flex items-center justify-center text-white text-xs font-bold">
              A
            </span>
            <span>AInterior</span>
          </div>
          <p className="text-brand-500 text-xs">
            &copy; 2026 AInterior. AI-powered interior design.
          </p>
        </div>
      </footer>
    </div>
  );
}
