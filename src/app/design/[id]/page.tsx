"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useApp } from "@/components/app-provider";
import { formatPrice } from "@/lib/utils";
import {
  ExternalLink,
  Save,
  CheckCircle2,
  ArrowLeft,
  Loader2,
  Sparkles,
  ShoppingBag,
  Info,
  Building2,
  Maximize2,
} from "lucide-react";

interface DesignProduct {
  productId: string;
  reason: string;
  category: string;
  product: {
    id: string;
    name: string;
    company_name: string;
    price_aed: number;
    original_price_aed: number | null;
    main_image_url: string;
    product_url: string;
    subcategory: string;
    materials: string | null;
    colors: string;
    description: string | null;
  };
}

interface Design {
  id: string;
  room_type: string;
  style_slug: string;
  room_length_cm: number;
  room_width_cm: number;
  budget_aed: number;
  status: string;
  visualization_url: string | null;
  design_explanation: string | null;
  total_cost_aed: number | null;
  selected_products: DesignProduct[] | null;
  created_at: string;
}

export default function DesignResultPage() {
  const params = useParams();
  const router = useRouter();
  const { t, currency } = useApp();
  const id = params.id as string;

  const [design, setDesign] = useState<Design | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(true); // Designs auto-save on generation
  const [vizExpanded, setVizExpanded] = useState(false);
  const [vizError, setVizError] = useState(false);
  const [vizLoaded, setVizLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/designs/${id}`);
        if (res.ok) {
          const data = await res.json();
          setDesign(data.design as Design);
        }
      } catch {
        console.error("Failed to load design");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-brand-600 animate-spin mx-auto mb-3" />
          <p className="text-brand-500 text-sm">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  if (!design) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-brand-500 mb-4">Design not found.</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="text-brand-600 hover:underline text-sm font-medium"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const products = design.selected_products || [];
  const totalCost = design.total_cost_aed || 0;
  const savings =
    design.budget_aed > totalCost ? design.budget_aed - totalCost : 0;

  // Group products by category
  const byCategory: Record<string, DesignProduct[]> = {};
  for (const sp of products) {
    const cat = sp.category || sp.product.subcategory;
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(sp);
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-brand-50/40 pb-20">
      {/* Expanded visualization modal */}
      {vizExpanded && design.visualization_url && !vizError && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setVizExpanded(false)}
        >
          <img
            src={design.visualization_url}
            alt="Room visualization"
            className="max-w-full max-h-full rounded-xl shadow-2xl"
            onError={() => setVizExpanded(false)}
          />
          <button
            className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 text-white rounded-full p-2 transition-colors"
            onClick={() => setVizExpanded(false)}
          >
            <ArrowLeft className="w-5 h-5 rotate-45" />
          </button>
        </div>
      )}

      {/* Back */}
      <div className="mx-auto max-w-6xl px-4 pt-6 pb-2">
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-1.5 text-brand-400 hover:text-brand-600 text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("nav.dashboard")}
        </button>
      </div>

      <div className="mx-auto max-w-6xl px-4 space-y-6">
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-brand-500 bg-brand-100 px-2 py-0.5 rounded-full capitalize">
                {design.style_slug}
              </span>
              <span className="text-xs text-brand-400">•</span>
              <span className="text-xs text-brand-400 capitalize">
                {design.room_type.replace("_", " ")}
              </span>
              <span className="text-xs text-brand-400">•</span>
              <span className="text-xs text-brand-400">
                {design.room_length_cm}×{design.room_width_cm} cm
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-brand-900">
              {t("result.title")}
            </h1>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => router.push("/design/new")}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm border border-brand-200 text-brand-600 hover:bg-brand-50 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              New Design
            </button>
            <div className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm bg-green-50 text-green-600 border border-green-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Saved
            </div>
          </div>
        </div>

        {/* Main Grid: Visualization + Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Visualization — takes 2 columns */}
          <div className="lg:col-span-2">
            <div className="relative rounded-2xl overflow-hidden bg-brand-100 aspect-[16/10] group cursor-pointer shadow-sm"
              onClick={() => !vizError && setVizExpanded(true)}>
              {design.visualization_url && !vizError ? (
                <>
                  {!vizLoaded && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10 bg-brand-100">
                      <div className="w-10 h-10 border-3 border-brand-300 border-t-brand-600 rounded-full animate-spin" />
                      <p className="text-xs text-brand-500">Generating visualization...</p>
                    </div>
                  )}
                  <img
                    src={design.visualization_url}
                    alt="Room visualization"
                    className={`w-full h-full object-cover group-hover:scale-102 transition-all duration-700 ${vizLoaded ? "opacity-100" : "opacity-0"}`}
                    onLoad={() => setVizLoaded(true)}
                    onError={() => setVizError(true)}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <button className="absolute top-3 right-3 bg-white/80 backdrop-blur-sm text-brand-700 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-brand-300">
                  <Sparkles className="w-12 h-12 mb-3" />
                  <p className="text-sm">
                    {vizError ? "Visualization failed to load" : "Visualization unavailable"}
                  </p>
                  {vizError && design.visualization_url && (
                    <a
                      href={design.visualization_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 text-xs text-brand-500 underline hover:text-brand-700"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Open image directly
                    </a>
                  )}
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-3">
                <div className="flex items-center gap-1.5">
                  <Info className="w-3 h-3 text-white/70" />
                  <p className="text-xs text-white/80">
                    {t("result.visualization.note")}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats column */}
          <div className="space-y-3">
            {/* Cost card */}
            <div className="bg-white rounded-xl border border-brand-100 p-5">
              <p className="text-xs text-brand-400 mb-1">
                {t("result.totalCost")}
              </p>
              <p className="text-3xl font-bold text-brand-900 leading-none">
                {formatPrice(totalCost, currency)}
              </p>
              {currency === "AED" && (
                <p className="text-sm text-brand-400 mt-1">
                  ≈ ${Math.round(totalCost * 0.27).toLocaleString()} USD
                </p>
              )}
              {savings > 0 && (
                <div className="mt-3 flex items-center gap-1.5 text-xs text-green-600 bg-green-50 px-2.5 py-1.5 rounded-lg">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  AED {savings.toLocaleString()} under budget
                </div>
              )}
            </div>

            {/* Stats grid */}
            <div className="bg-white rounded-xl border border-brand-100 p-5 space-y-3">
              {[
                { label: "Items selected", value: String(products.length) },
                {
                  label: "Style",
                  value:
                    design.style_slug.charAt(0).toUpperCase() +
                    design.style_slug.slice(1),
                },
                { label: "Retailers", value: "3 UAE stores" },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-brand-500">{label}</span>
                  <span className="font-medium text-brand-800">{value}</span>
                </div>
              ))}
            </div>

            {/* Retailers logos area */}
            <div className="bg-white rounded-xl border border-brand-100 p-4">
              <p className="text-xs text-brand-400 mb-3 font-medium">
                PRODUCTS FROM
              </p>
              <div className="space-y-2">
                {[
                  ...new Set(
                    products.map((sp) => sp.product.company_name)
                  ),
                ].map((company) => (
                  <div
                    key={company}
                    className="flex items-center gap-2 text-sm text-brand-700"
                  >
                    <div className="w-6 h-6 rounded bg-brand-100 flex items-center justify-center">
                      <Building2 className="w-3.5 h-3.5 text-brand-500" />
                    </div>
                    {company}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Design Explanation */}
        {design.design_explanation && (
          <div className="bg-white rounded-xl border border-brand-100 p-6">
            <h2 className="text-base font-semibold text-brand-800 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-500" />
              {t("result.explanation")}
            </h2>
            <div className="text-sm text-brand-600 leading-relaxed whitespace-pre-line">
              {design.design_explanation}
            </div>
          </div>
        )}

        {/* Products */}
        <div>
          <h2 className="text-lg font-semibold text-brand-800 mb-4 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-brand-500" />
            {t("result.products")}
            <span className="text-sm font-normal text-brand-400">
              ({products.length} items • All from approved UAE retailers)
            </span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((sp, i) => {
              const p = sp.product;
              let colors: string[] = [];
              try {
                colors = typeof p.colors === "string" ? JSON.parse(p.colors) : p.colors || [];
              } catch {
                colors = [];
              }
              const isOnSale =
                p.original_price_aed && p.original_price_aed > p.price_aed;

              return (
                <div
                  key={i}
                  className="bg-white rounded-xl border border-brand-100 overflow-hidden group hover:shadow-md hover:border-brand-200 transition-all"
                >
                  {/* Image */}
                  <div className="relative aspect-square bg-brand-50 overflow-hidden">
                    <img
                      src={p.main_image_url}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80";
                      }}
                    />
                    {isOnSale && (
                      <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        SALE
                      </span>
                    )}
                    <span className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm text-brand-600 text-[10px] font-medium px-2 py-0.5 rounded-full border border-brand-100 capitalize">
                      {sp.category || p.subcategory.replace(/-/g, " ")}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    {/* Retailer badge */}
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Building2 className="w-3 h-3 text-brand-400" />
                      <span className="text-xs text-brand-400 font-medium">
                        {p.company_name}
                      </span>
                    </div>

                    {/* Name */}
                    <h3 className="font-medium text-brand-800 text-sm leading-tight mb-2 line-clamp-2 min-h-[2.5rem]">
                      {p.name}
                    </h3>

                    {/* Colors */}
                    {colors.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2.5">
                        {colors.slice(0, 3).map((c: string, j: number) => (
                          <span
                            key={j}
                            className="text-[10px] text-brand-500 bg-brand-50 px-1.5 py-0.5 rounded-full border border-brand-100"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Price */}
                    <div className="flex items-baseline gap-2 mb-3">
                      <span className="text-xl font-bold text-brand-900">
                        {formatPrice(p.price_aed, currency)}
                      </span>
                      {isOnSale && (
                        <span className="text-xs text-brand-400 line-through">
                          {formatPrice(p.original_price_aed!, currency)}
                        </span>
                      )}
                    </div>

                    {/* AI Reason */}
                    <div className="bg-gradient-to-br from-brand-50 to-brand-100/50 rounded-lg px-3 py-2.5 mb-3 border border-brand-100">
                      <p className="text-[11px] leading-relaxed text-brand-600">
                        <span className="text-brand-700 font-semibold">
                          {t("result.product.why")}:{" "}
                        </span>
                        {sp.reason}
                      </p>
                    </div>

                    {/* Buy CTA */}
                    <a
                      href={p.product_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full bg-brand-700 hover:bg-brand-800 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      {t("result.product.buy")} on {p.company_name}
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
