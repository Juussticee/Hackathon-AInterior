"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useApp } from "@/components/app-provider";
import { useToast } from "@/components/toast";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";
import { Plus, Clock, CheckCircle, AlertCircle, Loader2, Sparkles, Trash2 } from "lucide-react";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t, currency } = useApp();
  const { toast, confirm } = useToast();
  const [designs, setDesigns] = useState<Record<string, unknown>[] | null>(null);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/designs")
        .then((r) => r.json())
        .then((data) => setDesigns(data.designs || []))
        .catch(() => { setDesigns([]); setLoadError(true); });
    }
  }, [status]);

  if (status === "loading" || designs === null) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-brand-600 animate-spin" />
      </div>
    );
  }

  const statusIcon = (s: string) => {
    switch (s) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "processing":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case "failed":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-brand-400" />;
    }
  };

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (deletingId) return;
    const ok = await confirm("Delete this design? This cannot be undone.");
    if (!ok) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/designs/${id}`, { method: "DELETE" });
      if (res.ok) {
        setDesigns((prev) => prev?.filter((d) => String(d.id) !== id) || []);
        toast("Design deleted", "success");
      } else {
        toast("Failed to delete design", "error");
      }
    } catch {
      toast("Something went wrong. Please try again.", "error");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-900">
            {t("dashboard.title")}
          </h1>
          <p className="text-brand-500 text-sm mt-1">
            {session?.user?.name || session?.user?.email}
          </p>
        </div>
        <Link
          href="/design/new"
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t("dashboard.create")}
        </Link>
      </div>

      {loadError && (
        <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          Failed to load your designs. Please refresh the page.
        </div>
      )}

      {designs.length === 0 && !loadError ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-brand-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Plus className="w-8 h-8 text-brand-400" />
          </div>
          <p className="text-brand-500 mb-4">{t("dashboard.empty")}</p>
          <Link
            href="/design/new"
            className="inline-flex items-center gap-2 bg-brand-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            {t("dashboard.create")}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {designs.map((d) => (
            <Link
              key={d.id as string}
              href={`/design/${d.id}`}
              className="bg-white rounded-xl border border-brand-100 overflow-hidden hover:shadow-md transition-shadow group"
            >
              <div className="aspect-[16/10] bg-brand-50 relative overflow-hidden">
                {d.visualization_url && !failedImages.has(String(d.id)) ? (
                  <img
                    src={String(d.visualization_url)}
                    alt={`${String(d.room_type ?? "").replace("_", " ")} design`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={() => {
                      setFailedImages((prev) => new Set(prev).add(String(d.id)));
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                    <Sparkles className="w-8 h-8 text-brand-300" />
                    <span className="text-xs text-brand-400">No visualization</span>
                  </div>
                )}
                <div className="absolute top-3 right-3 flex items-center gap-1.5">
                  <button
                    onClick={(e) => handleDelete(String(d.id), e)}
                    disabled={deletingId === String(d.id)}
                    className="flex items-center justify-center w-7 h-7 bg-white/90 backdrop-blur-sm rounded-full text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100 disabled:opacity-50"
                    title="Delete design"
                  >
                    {deletingId === String(d.id) ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <div className="flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-full px-2 py-1">
                    {statusIcon(String(d.status ?? ""))}
                    <span className="text-xs text-brand-600 capitalize">
                      {String(d.status ?? "")}
                    </span>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 text-xs text-brand-400 mb-1">
                  <span className="capitalize">
                    {String(d.room_type ?? "").replace("_", " ")}
                  </span>
                  <span>•</span>
                  <span className="capitalize">{String(d.style_slug ?? "")}</span>
                </div>
                <h3 className="font-medium text-brand-800">
                  {Number(d.room_length_cm ?? 0)} ×{" "}
                  {Number(d.room_width_cm ?? 0)} cm
                </h3>
                {d.total_cost_aed ? (
                  <p className="text-sm text-brand-600 font-medium mt-1">
                    {formatPrice(Number(d.total_cost_aed), currency)}
                  </p>
                ) : null}
                <p className="text-xs text-brand-400 mt-2">
                  {new Date(String(d.created_at ?? "")).toLocaleDateString()}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
