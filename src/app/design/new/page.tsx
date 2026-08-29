"use client";

import { useState, useRef, useEffect } from "react";
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
  Camera,
  Loader2,
  CheckCircle,
  X,
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

const PROCESSING_STAGES = [
  "Analyzing your room photo...",
  "Understanding space dimensions...",
  "Applying style rules...",
  "Filtering product catalog...",
  "AI selecting the best furniture...",
  "Validating budget & compatibility...",
  "Generating room visualization...",
  "Finalizing your design...",
];

export default function NewDesignPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t, language } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [processingStageIdx, setProcessingStageIdx] = useState(0);
  const [error, setError] = useState("");

  // Step 1: Room
  const [roomImageFile, setRoomImageFile] = useState<File | null>(null);
  const [roomImagePreview, setRoomImagePreview] = useState<string | null>(null);
  const [roomImageUploading, setRoomImageUploading] = useState(false);
  const [roomImageUrl, setRoomImageUrl] = useState<string | null>(null);
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

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/design/new");
    }
  }, [status, router]);

  // Cycle through processing stages with realistic timing
  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setProcessingStageIdx((i) =>
        i < PROCESSING_STAGES.length - 1 ? i + 1 : i
      );
    }, 3500);
    return () => clearInterval(interval);
  }, [loading]);

  // Handle image selection — upload immediately
  async function processImageFile(file: File) {
    if (file.size > 10 * 1024 * 1024) {
      setError("Image must be under 10MB");
      return;
    }

    setError("");
    setRoomImageFile(file);

    // Preview
    const preview = URL.createObjectURL(file);
    setRoomImagePreview(preview);

    // Upload to server
    setRoomImageUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (res.ok) {
        const { url } = await res.json();
        setRoomImageUrl(url);
      } else {
        // Fall back to base64 if upload fails
        const reader = new FileReader();
        reader.onload = (ev) => setRoomImageUrl(ev.target?.result as string);
        reader.readAsDataURL(file);
      }
    } catch {
      // Fallback: use base64
      const reader = new FileReader();
      reader.onload = (ev) => setRoomImageUrl(ev.target?.result as string);
      reader.readAsDataURL(file);
    } finally {
      setRoomImageUploading(false);
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    processImageFile(file);
  }

  const [dragOver, setDragOver] = useState(false);

  function clearImage() {
    setRoomImageFile(null);
    setRoomImagePreview(null);
    setRoomImageUrl(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleSubmit() {
    if (!session) {
      router.push("/login");
      return;
    }

    setLoading(true);
    setError("");
    setProcessingStageIdx(0);

    try {
      const budgetTier =
        budget < 3000 ? "economy" : budget < 8000 ? "moderate" : "premium";

      // Create design project
      const createRes = await fetch("/api/designs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomType,
          roomImageUrl: roomImageUrl || null,
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

      // Trigger AI pipeline
      const generateRes = await fetch(`/api/designs/${id}`, {
        method: "POST",
      });

      if (!generateRes.ok) {
        const errData = await generateRes.json().catch(() => ({}));
        throw new Error(errData.error || "AI processing failed");
      }

      router.push(`/design/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
      setProcessingStageIdx(0);
    }
  }

  const canProceedStep1 =
    roomLength &&
    roomWidth &&
    Number(roomLength) >= 100 &&
    Number(roomWidth) >= 100;
  const canProceedStep2 = budget > 0;

  if (status === "loading") {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-brand-600 animate-spin" />
      </div>
    );
  }

  return (
    <>
      {/* Full-screen processing overlay */}
      {loading && (
        <div className="fixed inset-0 bg-brand-900/70 backdrop-blur-md z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-10 max-w-sm mx-4 text-center shadow-2xl">
            <div className="relative w-16 h-16 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-brand-100" />
              <div className="absolute inset-0 rounded-full border-4 border-brand-600 border-t-transparent animate-spin" />
              <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-brand-500" />
            </div>
            <h2 className="text-xl font-bold text-brand-900 mb-2">
              Creating Your Design
            </h2>
            <p className="text-brand-500 text-sm min-h-[2.5rem] transition-all duration-500">
              {PROCESSING_STAGES[processingStageIdx]}
            </p>
            <div className="mt-5 flex gap-1.5 justify-center">
              {PROCESSING_STAGES.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 rounded-full transition-all duration-500 ${
                    i <= processingStageIdx
                      ? "bg-brand-500 w-4"
                      : "bg-brand-100 w-2"
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-brand-400 mt-4">
              This takes 30–60 seconds
            </p>
          </div>
        </div>
      )}

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
            {[
              t("wizard.step1"),
              t("wizard.step2"),
              t("wizard.step3"),
            ].map((label, idx) => {
              const s = idx + 1;
              return (
                <div key={s} className="flex items-center gap-2">
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                        s === step
                          ? "bg-brand-600 text-white shadow-lg shadow-brand-200"
                          : s < step
                          ? "bg-brand-500 text-white"
                          : "bg-brand-100 text-brand-400"
                      }`}
                    >
                      {s < step ? <CheckCircle className="w-4 h-4" /> : s}
                    </div>
                    <span
                      className={`text-xs hidden sm:block ${
                        s === step ? "text-brand-700 font-medium" : "text-brand-400"
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                  {s < 3 && (
                    <div
                      className={`w-14 sm:w-20 h-0.5 mb-4 ${
                        s < step ? "bg-brand-500" : "bg-brand-200"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Step Card */}
          <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-6 sm:p-8">
            {/* ---- STEP 1: YOUR SPACE ---- */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <Camera className="w-5 h-5 text-brand-500" />
                  <h2 className="text-xl font-semibold text-brand-800">
                    {t("wizard.step1")}
                  </h2>
                </div>

                {/* Room Image Upload */}
                <div>
                  <label className="block text-sm font-medium text-brand-700 mb-2">
                    {t("wizard.upload.title")}
                    <span className="text-brand-400 font-normal ml-1">
                      (optional — helps AI understand your space)
                    </span>
                  </label>
                  <div
                    onClick={() =>
                      !roomImagePreview && fileRef.current?.click()
                    }
                    onDragOver={(e) => {
                      if (roomImagePreview) return;
                      e.preventDefault();
                      setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                      if (roomImagePreview) return;
                      e.preventDefault();
                      setDragOver(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file && file.type.startsWith("image/")) {
                        processImageFile(file);
                      }
                    }}
                    className={`relative border-2 border-dashed rounded-xl transition-colors overflow-hidden ${
                      roomImagePreview
                        ? "border-brand-300 cursor-default"
                        : dragOver
                        ? "border-brand-500 bg-brand-50 cursor-pointer p-8 text-center"
                        : "border-brand-200 hover:border-brand-400 cursor-pointer p-8 text-center"
                    }`}
                  >
                    {roomImagePreview ? (
                      <div className="relative">
                        <img
                          src={roomImagePreview}
                          alt="Room preview"
                          className="w-full max-h-52 object-cover"
                        />
                        {roomImageUploading && (
                          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                            <Loader2 className="w-5 h-5 text-brand-600 animate-spin" />
                          </div>
                        )}
                        {!roomImageUploading && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              clearImage();
                            }}
                            className="absolute top-2 right-2 bg-white/90 hover:bg-white text-brand-700 rounded-full p-1.5 shadow"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <div className="absolute bottom-2 left-2 bg-green-500/90 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          {roomImageUploading ? "Uploading..." : "Ready"}
                        </div>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-brand-300 mx-auto mb-3 hover:text-brand-500 transition-colors" />
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
                            ? "bg-brand-600 text-white border-brand-600 shadow-sm"
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
                  <label className="block text-sm font-medium text-brand-700 mb-1">
                    <Ruler className="w-4 h-4 inline mr-1" />
                    {t("wizard.room.dimensions")} *
                  </label>
                  <p className="text-xs text-brand-400 mb-2">
                    Enter dimensions in centimeters (e.g. 450 × 350 for a 4.5m × 3.5m room)
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <input
                        type="number"
                        value={roomLength}
                        onChange={(e) => setRoomLength(e.target.value)}
                        placeholder="Length (cm)"
                        className="w-full px-3 py-2.5 border border-brand-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                        min={100}
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        value={roomWidth}
                        onChange={(e) => setRoomWidth(e.target.value)}
                        placeholder="Width (cm)"
                        className="w-full px-3 py-2.5 border border-brand-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                        min={100}
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        value={roomHeight}
                        onChange={(e) => setRoomHeight(e.target.value)}
                        placeholder="Height (optional)"
                        className="w-full px-3 py-2.5 border border-brand-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                        min={200}
                      />
                    </div>
                  </div>
                  {roomLength && roomWidth && (
                    <p className="text-xs text-brand-500 mt-1.5">
                      Area:{" "}
                      {(
                        (Number(roomLength) / 100) *
                        (Number(roomWidth) / 100)
                      ).toFixed(1)}{" "}
                      m²
                    </p>
                  )}
                </div>

                {/* Existing Furniture */}
                <div>
                  <label className="block text-sm font-medium text-brand-700 mb-1">
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
              <div className="space-y-7">
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
                        keywords: ["White", "Grey", "Black", "Clean"],
                      },
                      {
                        slug: "japandi" as const,
                        name: t("wizard.style.japandi"),
                        img: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=400&q=80",
                        desc: "Natural materials, serene simplicity, warm neutrals",
                        keywords: ["Oak", "Linen", "Ceramic", "Rattan"],
                      },
                    ].map((s) => (
                      <button
                        key={s.slug}
                        type="button"
                        onClick={() => setStyle(s.slug)}
                        className={`relative rounded-xl overflow-hidden aspect-[4/3] group transition-all ${
                          style === s.slug
                            ? "ring-3 ring-brand-600 ring-offset-2"
                            : "hover:ring-2 hover:ring-brand-300 hover:ring-offset-1"
                        }`}
                      >
                        <img
                          src={s.img}
                          alt={s.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&q=80";
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-brand-900/75 to-transparent" />
                        <div className="absolute bottom-3 left-3 right-3 text-left">
                          <h3 className="text-white font-semibold text-sm mb-1">
                            {s.name}
                          </h3>
                          <p className="text-white/70 text-xs leading-snug">
                            {s.desc}
                          </p>
                        </div>
                        {style === s.slug && (
                          <div className="absolute top-2.5 right-2.5 w-7 h-7 bg-brand-600 rounded-full flex items-center justify-center shadow-lg">
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
                  <div className="bg-brand-50 rounded-xl p-5 space-y-4">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <span className="text-3xl font-bold text-brand-900">
                          AED {budget.toLocaleString()}
                        </span>
                        <span className="ml-2 text-sm text-brand-400">
                          ≈ ${Math.round(budget * 0.27).toLocaleString()} USD
                        </span>
                      </div>
                      <span
                        className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                          budget < 3000
                            ? "bg-green-50 text-green-600"
                            : budget < 8000
                            ? "bg-yellow-50 text-yellow-600"
                            : "bg-purple-50 text-purple-600"
                        }`}
                      >
                        {budget < 3000
                          ? t("wizard.budget.economy")
                          : budget < 8000
                          ? t("wizard.budget.moderate")
                          : t("wizard.budget.premium")}
                      </span>
                    </div>

                    <input
                      type="range"
                      min={1000}
                      max={20000}
                      step={500}
                      value={budget}
                      onChange={(e) => setBudget(Number(e.target.value))}
                      className="w-full accent-brand-600 cursor-pointer"
                    />

                    <div className="flex justify-between text-xs text-brand-400">
                      <span>AED 1,000</span>
                      <span>AED 10,000</span>
                      <span>AED 20,000</span>
                    </div>

                    {/* Quick select buttons */}
                    <div className="flex gap-2 pt-1">
                      {[2000, 5000, 8000, 15000].map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setBudget(v)}
                          className={`flex-1 text-xs py-1.5 rounded-lg border transition-all ${
                            budget === v
                              ? "bg-brand-600 text-white border-brand-600"
                              : "bg-white text-brand-500 border-brand-200 hover:border-brand-400"
                          }`}
                        >
                          {v.toLocaleString()}
                        </button>
                      ))}
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
                  <label className="block text-sm font-medium text-brand-700 mb-1">
                    {t("wizard.requirements.title")}
                  </label>
                  <p className="text-xs text-brand-400 mb-3">
                    {t("wizard.requirements.desc")}
                  </p>
                  <textarea
                    value={requirements}
                    onChange={(e) => setRequirements(e.target.value)}
                    placeholder={t("wizard.requirements.placeholder")}
                    rows={6}
                    className="w-full px-4 py-3 border border-brand-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 resize-none"
                  />
                  <p className="text-xs text-brand-400 mt-1.5">
                    Tip: Mention specific items you want (e.g. "queen bed",
                    "floor lamp"), colors, or any special requirements.
                  </p>
                </div>

                {/* Summary card */}
                <div className="bg-gradient-to-br from-brand-50 to-brand-100/50 rounded-xl p-5 space-y-3">
                  <h4 className="text-sm font-semibold text-brand-700 mb-2">
                    Design Summary
                  </h4>
                  <div className="grid grid-cols-2 gap-y-2.5 text-sm">
                    {[
                      [
                        "Room",
                        ROOM_TYPES.find((r) => r.value === roomType)?.label,
                      ],
                      ["Size", `${roomLength} × ${roomWidth} cm`],
                      ["Style", style.charAt(0).toUpperCase() + style.slice(1)],
                      ["Budget", `AED ${budget.toLocaleString()}`],
                    ].map(([key, val]) => (
                      <div key={key} className="contents">
                        <span className="text-brand-500">{key}</span>
                        <span className="text-brand-800 font-medium">{val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mt-5 flex items-start gap-2 bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg">
                <X className="w-4 h-4 mt-0.5 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-8 pt-6 border-t border-brand-100">
              {step > 1 ? (
                <button
                  onClick={() => setStep(step - 1)}
                  className="flex items-center gap-2 text-brand-600 hover:text-brand-800 text-sm font-medium px-3 py-2 rounded-lg hover:bg-brand-50 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {t("wizard.back")}
                </button>
              ) : (
                <div />
              )}

              {step < 3 ? (
                <button
                  onClick={() => {
                    setError("");
                    setStep(step + 1);
                  }}
                  disabled={step === 1 ? !canProceedStep1 : !canProceedStep2}
                  className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-200 disabled:text-brand-400 disabled:cursor-not-allowed text-white px-7 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
                >
                  {t("wizard.next")}
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 disabled:cursor-wait text-white px-7 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
                >
                  <Sparkles className="w-4 h-4" />
                  {t("wizard.submit")}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
