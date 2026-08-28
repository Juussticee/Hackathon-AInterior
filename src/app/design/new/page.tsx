"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useApp } from "@/components/app-provider";
import {
  Upload,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Ruler,
  MessageSquare,
  Image,
  Loader2,
  CheckCircle,
} from "lucide-react";
import type { RoomType } from "@/lib/types";

const ROOM_TYPES: { value: RoomType; label: string; labelAr: string }[] = [
  { value: "bedroom", label: "Bedroom", labelAr: "غرفة نوم" },
  { value: "living_room", label: "Living Room", labelAr: "غرفة معيشة" },
  { value: "dining_room", label: "Dining Room", labelAr: "غرفة طعام" },
  { value: "office", label: "Home Office", labelAr: "مكتب منزلي" },
  { value: "studio", label: "Studio", labelAr: "استوديو" },
  { value: "kids_room", label: "Kids Room", labelAr: "غرفة أطفال" },
];

export default function NewDesignPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { t, language } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [processingStage, setProcessingStage] = useState("");
  const [error, setError] = useState("");

  // Step 1: Room
  const [roomImage, setRoomImage] = useState<string | null>(null);
  const [roomType, setRoomType] = useState<RoomType>("bedroom");
  const [roomLength, setRoomLength] = useState("");
  const [roomWidth, setRoomWidth] = useState("");
  const [roomHeight, setRoomHeight] = useState("");
  const [existingFurniture, setExistingFurniture] = useState("");

  // Step 2: Style & Budget
  const [style, setStyle] = useState<"minimalist" | "japandi">("japandi");
  const [budget, setBudget] = useState(5000);

  // Step 3: Requirements
  const [requirements, setRequirements] = useState("");

  // Handle image upload (convert to base64 data URL for demo)
  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError("Image must be under 10MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setRoomImage(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSubmit() {
    if (!session) {
      router.push("/login");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Determine budget tier
      const budgetTier =
        budget < 3000 ? "economy" : budget < 8000 ? "moderate" : "premium";

      // Step 1: Create design project
      setProcessingStage(t("wizard.processing.analyzing"));
      const createRes = await fetch("/api/designs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomType,
          roomImageUrl: roomImage,
          roomLengthCm: Number(roomLength),
          roomWidthCm: Number(roomWidth),
          roomHeightCm: roomHeight ? Number(roomHeight) : null,
          existingFurniture: existingFurniture || null,
          additionalRequirements: requirements || null,
          styleSlug: style,
          budgetAed: budget,
          budgetTier,
        }),
      });

      if (!createRes.ok) throw new Error("Failed to create design");
      const { id } = await createRes.json();

      // Step 2: Trigger AI pipeline
      setProcessingStage(t("wizard.processing.selecting"));
      const generateRes = await fetch(`/api/designs/${id}`, {
        method: "POST",
      });

      if (!generateRes.ok) throw new Error("AI processing failed");

      setProcessingStage(t("wizard.processing.almost"));

      // Redirect to result page
      router.push(`/design/${id}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong"
      );
      setLoading(false);
    }
  }

  const canProceedStep1 = roomLength && roomWidth && Number(roomLength) > 0 && Number(roomWidth) > 0;
  const canProceedStep2 = budget > 0;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-brand-50/50">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-900">
            {t("wizard.title")}
          </h1>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                  s === step
                    ? "bg-brand-600 text-white"
                    : s < step
                    ? "bg-brand-200 text-brand-600"
                    : "bg-brand-100 text-brand-400"
                }`}
              >
                {s < step ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  s
                )}
              </div>
              {s < 3 && (
                <div
                  className={`w-12 h-0.5 ${
                    s < step ? "bg-brand-400" : "bg-brand-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-6 sm:p-8">
          {/* ---- STEP 1: YOUR SPACE ---- */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <Image className="w-5 h-5 text-brand-500" />
                <h2 className="text-xl font-semibold text-brand-800">
                  {t("wizard.step1")}
                </h2>
              </div>

              {/* Room Image Upload */}
              <div>
                <label className="block text-sm font-medium text-brand-700 mb-2">
                  {t("wizard.upload.title")}
                </label>
                <div
                  onClick={() => fileRef.current?.click()}
                  className="relative border-2 border-dashed border-brand-200 hover:border-brand-400 rounded-xl p-8 text-center cursor-pointer transition-colors group"
                >
                  {roomImage ? (
                    <div className="relative">
                      <img
                        src={roomImage}
                        alt="Room"
                        className="max-h-48 mx-auto rounded-lg object-cover"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setRoomImage(null);
                        }}
                        className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-md"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-brand-300 mx-auto mb-3 group-hover:text-brand-500 transition-colors" />
                      <p className="text-sm text-brand-500">
                        {t("wizard.upload.drag")}
                      </p>
                      <p className="text-xs text-brand-400 mt-1">
                        {t("wizard.upload.formats")}
                      </p>
                    </>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Room Type */}
              <div>
                <label className="block text-sm font-medium text-brand-700 mb-2">
                  {t("wizard.room.type")}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ROOM_TYPES.map((rt) => (
                    <button
                      key={rt.value}
                      type="button"
                      onClick={() => setRoomType(rt.value)}
                      className={`px-3 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                        roomType === rt.value
                          ? "bg-brand-600 text-white border-brand-600"
                          : "bg-white text-brand-600 border-brand-200 hover:border-brand-400"
                      }`}
                    >
                      {language === "ar" ? rt.labelAr : rt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dimensions */}
              <div>
                <label className="block text-sm font-medium text-brand-700 mb-2">
                  <Ruler className="w-4 h-4 inline mr-1" />
                  {t("wizard.room.dimensions")}
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <input
                    type="number"
                    value={roomLength}
                    onChange={(e) => setRoomLength(e.target.value)}
                    placeholder={t("wizard.room.length")}
                    className="px-3 py-2.5 border border-brand-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    min={100}
                  />
                  <input
                    type="number"
                    value={roomWidth}
                    onChange={(e) => setRoomWidth(e.target.value)}
                    placeholder={t("wizard.room.width")}
                    className="px-3 py-2.5 border border-brand-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    min={100}
                  />
                  <input
                    type="number"
                    value={roomHeight}
                    onChange={(e) => setRoomHeight(e.target.value)}
                    placeholder={t("wizard.room.height")}
                    className="px-3 py-2.5 border border-brand-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    min={200}
                  />
                </div>
              </div>

              {/* Existing Furniture */}
              <div>
                <label className="block text-sm font-medium text-brand-700 mb-2">
                  {t("wizard.room.existing")}
                </label>
                <textarea
                  value={existingFurniture}
                  onChange={(e) => setExistingFurniture(e.target.value)}
                  placeholder={t("wizard.room.existing.placeholder")}
                  rows={2}
                  className="w-full px-3 py-2.5 border border-brand-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 resize-none"
                />
              </div>
            </div>
          )}

          {/* ---- STEP 2: STYLE & BUDGET ---- */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <Sparkles className="w-5 h-5 text-brand-500" />
                <h2 className="text-xl font-semibold text-brand-800">
                  {t("wizard.step2")}
                </h2>
              </div>

              {/* Style Selection */}
              <div>
                <label className="block text-sm font-medium text-brand-700 mb-3">
                  {t("wizard.style.title")}
                </label>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    {
                      slug: "minimalist" as const,
                      name: t("wizard.style.minimalist"),
                      img: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=400&q=80",
                      desc: "Clean lines, neutral tones, purposeful pieces",
                    },
                    {
                      slug: "japandi" as const,
                      name: t("wizard.style.japandi"),
                      img: "https://images.unsplash.com/photo-1616486338812-3dadae5b4ace?w=400&q=80",
                      desc: "Natural materials, serene simplicity",
                    },
                  ].map((s) => (
                    <button
                      key={s.slug}
                      type="button"
                      onClick={() => setStyle(s.slug)}
                      className={`relative rounded-xl overflow-hidden aspect-[4/3] group transition-all ${
                        style === s.slug
                          ? "ring-2 ring-brand-600 ring-offset-2"
                          : "hover:ring-1 hover:ring-brand-300"
                      }`}
                    >
                      <img
                        src={s.img}
                        alt={s.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-brand-900/70 to-transparent" />
                      <div className="absolute bottom-3 left-3 right-3">
                        <h3 className="text-white font-semibold text-sm">
                          {s.name}
                        </h3>
                        <p className="text-white/70 text-xs mt-0.5">
                          {s.desc}
                        </p>
                      </div>
                      {style === s.slug && (
                        <div className="absolute top-2 right-2 w-6 h-6 bg-brand-600 rounded-full flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Budget */}
              <div>
                <label className="block text-sm font-medium text-brand-700 mb-3">
                  {t("wizard.budget.title")}
                </label>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-brand-800">
                      AED {budget.toLocaleString()}
                    </span>
                    <span className="text-sm text-brand-400">
                      ≈ ${(budget * 0.27).toLocaleString("en-US", { maximumFractionDigits: 0 })} USD
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1000}
                    max={20000}
                    step={500}
                    value={budget}
                    onChange={(e) => setBudget(Number(e.target.value))}
                    className="w-full accent-brand-600"
                  />
                  <div className="flex justify-between text-xs text-brand-400">
                    <span>{t("wizard.budget.economy")}</span>
                    <span>{t("wizard.budget.moderate")}</span>
                    <span>{t("wizard.budget.premium")}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ---- STEP 3: REQUIREMENTS ---- */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <MessageSquare className="w-5 h-5 text-brand-500" />
                <h2 className="text-xl font-semibold text-brand-800">
                  {t("wizard.step3")}
                </h2>
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-700 mb-2">
                  {t("wizard.requirements.title")}
                </label>
                <p className="text-xs text-brand-400 mb-3">
                  {t("wizard.requirements.desc")}
                </p>
                <textarea
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  placeholder={t("wizard.requirements.placeholder")}
                  rows={5}
                  className="w-full px-4 py-3 border border-brand-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 resize-none"
                />
              </div>

              {/* Summary */}
              <div className="bg-brand-50 rounded-xl p-4 space-y-2">
                <h4 className="text-sm font-medium text-brand-700">
                  Design Summary
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-brand-500">Room:</span>
                  <span className="text-brand-800 font-medium capitalize">
                    {roomType.replace("_", " ")}
                  </span>
                  <span className="text-brand-500">Dimensions:</span>
                  <span className="text-brand-800 font-medium">
                    {roomLength} × {roomWidth} cm
                  </span>
                  <span className="text-brand-500">Style:</span>
                  <span className="text-brand-800 font-medium capitalize">
                    {style}
                  </span>
                  <span className="text-brand-500">Budget:</span>
                  <span className="text-brand-800 font-medium">
                    AED {budget.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ---- PROCESSING OVERLAY ---- */}
          {loading && (
            <div className="fixed inset-0 bg-brand-900/60 backdrop-blur-sm z-50 flex items-center justify-center">
              <div className="bg-white rounded-2xl p-8 max-w-sm mx-4 text-center">
                <Loader2 className="w-10 h-10 text-brand-600 mx-auto animate-spin mb-4" />
                <p className="text-brand-800 font-medium text-lg mb-2">
                  {t("wizard.step4")}
                </p>
                <p className="text-brand-500 text-sm animate-pulse-soft">
                  {processingStage}
                </p>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg mt-4">
              {error}
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-6 border-t border-brand-100">
            {step > 1 ? (
              <button
                onClick={() => setStep(step - 1)}
                className="flex items-center gap-2 text-brand-600 hover:text-brand-800 text-sm font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                {t("wizard.back")}
              </button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={step === 1 ? !canProceedStep1 : !canProceedStep2}
                className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-200 disabled:text-brand-400 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                {t("wizard.next")}
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                {t("wizard.submit")}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
