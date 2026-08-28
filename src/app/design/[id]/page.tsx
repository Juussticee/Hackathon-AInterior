"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useApp } from "@/components/app-provider";
import { formatPrice } from "@/lib/utils";
import {
  ExternalLink,
  Save,
  CheckCircle,
  ArrowLeft,
  Loader2,
  Sparkles,
  ShoppingCart,
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
    main_image_url: string;
    product_url: string;
    subcategory: string;
    materials: string | null;
    colors: string;
  };
}

export default function DesignResultPage() {
  const params = useParams();
  const router = useRouter();
  const { t, currency } = useApp();
  const id = params.id as string;

  const [design, setDesign] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/designs/${id}`);
        if (res.ok) {
          const data = await res.json();
          setDesign(data.design);
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
          <Loader2 className="w-8 h-8 text-brand-600 animate-spin mx-auto mb-4" />
          <p className="text-brand-500">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  if (!design) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-brand-500 mb-4">Design not found</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="text-brand-600 hover:text-brand-800 font-medium text-sm"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const products = (design.selected_products || []) as DesignProduct[];
  const totalCost = (design.total_cost_aed as number) || 0;
  const visualizationUrl = design.visualization_url as string | null;
  const explanation = design.design_explanation as string | null;
  const roomType = (design.room_type as string) || "";
  const styleSlug = (design.style_slug as string) || "";

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-brand-50/50 pb-16">
      {/* Back button */}
      <div className="mx-auto max-w-6xl px-4 pt-6">
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-2 text-brand-500 hover:text-brand-700 text-sm mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("nav.dashboard")}
        </button>
      </div>

      <div className="mx-auto max-w-6xl px-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-brand-900">
              {t("result.title")}
            </h1>
            <p className="text-brand-500 text-sm mt-1 capitalize">
              {styleSlug} • {roomType.replace("_", " ")}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setSaved(true)}
              disabled={saved}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                saved
                  ? "bg-green-50 text-green-600 border border-green-200"
                  : "bg-brand-600 text-white hover:bg-brand-700"
              }`}
            >
              {saved ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  {t("result.saved")}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {t("result.save")}
                </>
              )}
            </button>
            <button
              onClick={() => router.push("/design/new")}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium border border-brand-200 text-brand-600 hover:bg-brand-50 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              {t("result.newDesign")}
            </button>
          </div>
        </div>

        {/* Visualization */}
        {visualizationUrl && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-brand-800 mb-3">
              {t("result.visualization")}
            </h2>
            <div className="relative rounded-2xl overflow-hidden aspect-[16/9] bg-brand-100">
              <img
                src={visualizationUrl}
                alt="Room visualization"
                className="w-full h-full object-cover"
              />
            </div>
            <p className="text-xs text-brand-400 mt-2 italic">
              {t("result.visualization.note")}
            </p>
          </div>
        )}

        {/* Cost Summary */}
        <div className="bg-white rounded-xl border border-brand-100 p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-sm text-brand-500 mb-1">
                {t("result.totalCost")}
              </p>
              <p className="text-3xl font-bold text-brand-900">
                {formatPrice(totalCost, currency)}
              </p>
              {currency === "USD" && (
                <p className="text-sm text-brand-400 mt-1">
                  AED {totalCost.toLocaleString()}
                </p>
              )}
            </div>
            <div className="flex gap-6 text-center">
              <div>
                <p className="text-2xl font-bold text-brand-700">
                  {products.length}
                </p>
                <p className="text-xs text-brand-400">Items</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-brand-700 capitalize">
                  {styleSlug}
                </p>
                <p className="text-xs text-brand-400">Style</p>
              </div>
            </div>
          </div>
        </div>

        {/* Design Explanation */}
        {explanation && (
          <div className="bg-white rounded-xl border border-brand-100 p-6 mb-8">
            <h2 className="text-lg font-semibold text-brand-800 mb-3 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-brand-500" />
              {t("result.explanation")}
            </h2>
            <div className="prose prose-sm prose-brand max-w-none text-brand-600 leading-relaxed whitespace-pre-line">
              {explanation}
            </div>
          </div>
        )}

        {/* Selected Products */}
        <div>
          <h2 className="text-lg font-semibold text-brand-800 mb-4 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-brand-500" />
            {t("result.products")} ({products.length})
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((sp, i) => {
              const p = sp.product;
              const colors =
                typeof p.colors === "string"
                  ? JSON.parse(p.colors)
                  : p.colors || [];

              return (
                <div
                  key={i}
                  className="bg-white rounded-xl border border-brand-100 overflow-hidden hover:shadow-md transition-shadow group"
                >
                  {/* Product Image */}
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
                    {p.price_aed < (design.budget_aed as number) * 0.1 && (
                      <span className="absolute top-2 left-2 bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">
                        Great value
                      </span>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="p-4">
                    <p className="text-xs text-brand-400 mb-1">
                      {p.company_name} •{" "}
                      <span className="capitalize">
                        {p.subcategory.replace(/-/g, " ")}
                      </span>
                    </p>
                    <h3 className="font-medium text-brand-800 text-sm leading-tight mb-2 line-clamp-2">
                      {p.name}
                    </h3>

                    {/* Colors */}
                    {Array.isArray(colors) && colors.length > 0 && (
                      <div className="flex gap-1 mb-2">
                        {colors.slice(0, 3).map((color: string, j: number) => (
                          <span
                            key={j}
                            className="text-[10px] text-brand-400 bg-brand-50 px-1.5 py-0.5 rounded"
                          >
                            {color}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Price */}
                    <div className="flex items-baseline gap-2 mb-3">
                      <span className="text-lg font-bold text-brand-900">
                        {formatPrice(p.price_aed, currency)}
                      </span>
                      {currency === "AED" && (
                        <span className="text-xs text-brand-400">
                          ≈ ${Math.round(p.price_aed * 0.27)}
                        </span>
                      )}
                    </div>

                    {/* Reason */}
                    <div className="bg-brand-50 rounded-lg px-3 py-2 mb-3">
                      <p className="text-xs text-brand-500">
                        <span className="font-medium text-brand-600">
                          {t("result.product.why")}:
                        </span>{" "}
                        {sp.reason}
                      </p>
                    </div>

                    {/* Buy Button */}
                    <a
                      href={p.product_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      {t("result.product.buy")}
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
