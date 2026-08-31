"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useApp } from "@/components/app-provider";
import {
  Loader2,
  Building2,
  Package,
  Plus,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from "lucide-react";
import { useToast } from "@/components/toast";

interface Company {
  id: string;
  name: string;
  slug: string;
  enabled: number;
  product_count: number;
}

interface Product {
  id: string;
  name: string;
  company_name: string;
  subcategory: string;
  price_aed: number;
  main_image_url: string;
  is_available: number;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t } = useApp();
  const { toast } = useToast();
  const [tab, setTab] = useState<"companies" | "products">("companies");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [formError, setFormError] = useState("");

  // Add company form
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newCompanySlug, setNewCompanySlug] = useState("");
  const [newCompanyWebsite, setNewCompanyWebsite] = useState("");

  // Add product form
  const [showProductForm, setShowProductForm] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: "",
    companyId: "",
    subcategory: "",
    priceAed: "",
    productUrl: "",
    mainImageUrl: "",
    materials: "",
    description: "",
  });

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated") {
      const role = (session?.user as { role?: string } | undefined)?.role;
      if (role !== "admin") {
        router.push("/dashboard");
      }
    }
  }, [status, session, router]);

  useEffect(() => {
    if (status === "authenticated") {
      loadData();
    }
  }, [status]);

  async function loadData() {
    try {
      const compRes = await fetch("/api/admin/companies");
      if (compRes.ok) {
        const d = await compRes.json();
        setCompanies(d.companies || []);
      }
      const all: Product[] = [];
      let page = 1;
      let pages = 1;
      do {
        const res = await fetch(`/api/admin/products?page=${page}&limit=100`);
        if (!res.ok) break;
        const d = await res.json();
        all.push(...(d.products || []));
        pages = d.pages || 1;
        page++;
      } while (page <= pages);
      setProducts(all);
    } catch (err) {
      setLoadError("Failed to load admin data. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function addCompany() {
    if (!newCompanyName.trim()) {
      setFormError("Company name is required");
      return;
    }
    setFormError("");
    try {
      const res = await fetch("/api/admin/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCompanyName,
          slug: newCompanySlug || newCompanyName.toLowerCase().replace(/\s+/g, "-"),
          website: newCompanyWebsite,
        }),
      });
      if (res.ok) {
        setNewCompanyName("");
        setNewCompanySlug("");
        setNewCompanyWebsite("");
        setShowCompanyForm(false);
        loadData();
      } else {
        const data = await res.json().catch(() => ({}));
        setFormError(data.error || "Failed to create company");
      }
    } catch {
      setFormError("Network error. Please try again.");
    }
  }

  async function addProduct() {
    if (!newProduct.name.trim() || !newProduct.companyId || !newProduct.priceAed) {
      setFormError("Name, company, and price are required");
      return;
    }
    setFormError("");
    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newProduct,
          priceAed: Number(newProduct.priceAed),
        }),
      });
      if (res.ok) {
        setNewProduct({
          name: "",
          companyId: "",
          subcategory: "",
          priceAed: "",
          productUrl: "",
          mainImageUrl: "",
          materials: "",
          description: "",
        });
        setShowProductForm(false);
        loadData();
      } else {
        const data = await res.json().catch(() => ({}));
        setFormError(data.error || "Failed to create product");
      }
    } catch {
      setFormError("Network error. Please try again.");
    }
  }

  async function toggleProduct(id: string, current: number) {
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAvailable: !current }),
      });
      if (res.ok) {
        setProducts((prev) =>
          prev.map((p) =>
            p.id === id ? { ...p, is_available: current ? 0 : 1 } : p
          )
        );
        toast(current ? "Product disabled" : "Product enabled", "success");
      }
    } catch {
      toast("Failed to update product", "error");
    }
  }

  async function deleteProduct(id: string) {
    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
      if (res.ok) {
        setProducts((prev) => prev.filter((p) => p.id !== id));
        toast("Product deleted", "success");
      }
    } catch {
      toast("Failed to delete product", "error");
    }
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-brand-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold text-brand-900 mb-6">
        {t("admin.title")}
      </h1>

      {loadError && (
        <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {loadError}
        </div>
      )}
      {formError && (
        <div className="mb-6 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
          {formError}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 mb-8 border-b border-brand-100">
        <button
          onClick={() => setTab("companies")}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
            tab === "companies"
              ? "border-brand-600 text-brand-800"
              : "border-transparent text-brand-400 hover:text-brand-600"
          }`}
        >
          <Building2 className="w-4 h-4 inline mr-1.5" />
          {t("admin.companies")} ({companies.length})
        </button>
        <button
          onClick={() => setTab("products")}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
            tab === "products"
              ? "border-brand-600 text-brand-800"
              : "border-transparent text-brand-400 hover:text-brand-600"
          }`}
        >
          <Package className="w-4 h-4 inline mr-1.5" />
          {t("admin.products")} ({products.length})
        </button>
      </div>

      {/* Companies Tab */}
      {tab === "companies" && (
        <div>
          <button
            onClick={() => setShowCompanyForm(!showCompanyForm)}
            className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium mb-4"
          >
            <Plus className="w-4 h-4" />
            {t("admin.addCompany")}
          </button>

          {showCompanyForm && (
            <div className="bg-white border border-brand-100 rounded-xl p-4 mb-4 space-y-3">
              <input
                type="text"
                placeholder="Company name"
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                className="w-full px-3 py-2 border border-brand-200 rounded-lg text-sm"
              />
              <input
                type="text"
                placeholder="Slug (auto-generated if empty)"
                value={newCompanySlug}
                onChange={(e) => setNewCompanySlug(e.target.value)}
                className="w-full px-3 py-2 border border-brand-200 rounded-lg text-sm"
              />
              <input
                type="url"
                placeholder="Website URL"
                value={newCompanyWebsite}
                onChange={(e) => setNewCompanyWebsite(e.target.value)}
                className="w-full px-3 py-2 border border-brand-200 rounded-lg text-sm"
              />
              <div className="flex gap-2">
                <button
                  onClick={addCompany}
                  className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm"
                >
                  {t("admin.save")}
                </button>
                <button
                  onClick={() => setShowCompanyForm(false)}
                  className="text-brand-500 px-4 py-2 text-sm"
                >
                  {t("admin.cancel")}
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {companies.map((c) => (
              <div
                key={c.id}
                className="bg-white border border-brand-100 rounded-xl p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center text-brand-600 font-bold">
                    {c.name[0]}
                  </div>
                  <div>
                    <h3 className="font-medium text-brand-800">{c.name}</h3>
                    <p className="text-xs text-brand-400">
                      {c.product_count} products • {c.slug}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      c.enabled
                        ? "bg-green-50 text-green-600"
                        : "bg-red-50 text-red-600"
                    }`}
                  >
                    {c.enabled ? "Active" : "Disabled"}
                  </span>
                  {c.enabled ? (
                    <ToggleRight className="w-5 h-5 text-green-500" />
                  ) : (
                    <ToggleLeft className="w-5 h-5 text-brand-300" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Products Tab */}
      {tab === "products" && (
        <div>
          <button
            onClick={() => setShowProductForm(!showProductForm)}
            className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium mb-4"
          >
            <Plus className="w-4 h-4" />
            {t("admin.addProduct")}
          </button>

          {showProductForm && (
            <div className="bg-white border border-brand-100 rounded-xl p-4 mb-4 space-y-3">
              <input
                type="text"
                placeholder="Product name"
                value={newProduct.name}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, name: e.target.value })
                }
                className="w-full px-3 py-2 border border-brand-200 rounded-lg text-sm"
              />
              <select
                value={newProduct.companyId}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, companyId: e.target.value })
                }
                className="w-full px-3 py-2 border border-brand-200 rounded-lg text-sm"
              >
                <option value="">Select company</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Subcategory (e.g. beds, sofas)"
                  value={newProduct.subcategory}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, subcategory: e.target.value })
                  }
                  className="px-3 py-2 border border-brand-200 rounded-lg text-sm"
                />
                <input
                  type="number"
                  placeholder="Price (AED)"
                  value={newProduct.priceAed}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, priceAed: e.target.value })
                  }
                  className="px-3 py-2 border border-brand-200 rounded-lg text-sm"
                />
              </div>
              <input
                type="url"
                placeholder="Product URL"
                value={newProduct.productUrl}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, productUrl: e.target.value })
                }
                className="w-full px-3 py-2 border border-brand-200 rounded-lg text-sm"
              />
              <input
                type="url"
                placeholder="Main image URL"
                value={newProduct.mainImageUrl}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, mainImageUrl: e.target.value })
                }
                className="w-full px-3 py-2 border border-brand-200 rounded-lg text-sm"
              />
              <textarea
                placeholder="Description"
                value={newProduct.description}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, description: e.target.value })
                }
                rows={2}
                className="w-full px-3 py-2 border border-brand-200 rounded-lg text-sm resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={addProduct}
                  className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm"
                >
                  {t("admin.save")}
                </button>
                <button
                  onClick={() => setShowProductForm(false)}
                  className="text-brand-500 px-4 py-2 text-sm"
                >
                  {t("admin.cancel")}
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {products.map((p) => (
              <div
                key={p.id}
                className="bg-white border border-brand-100 rounded-xl p-3 flex items-center gap-3"
              >
                <img
                  src={p.main_image_url}
                  alt={p.name}
                  className="w-12 h-12 rounded-lg object-cover bg-brand-50"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=100&q=80";
                  }}
                />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-brand-800 truncate">
                    {p.name}
                  </h4>
                  <p className="text-xs text-brand-400">
                    {p.company_name} • {p.subcategory} • AED{" "}
                    {p.price_aed.toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => toggleProduct(p.id, p.is_available)}
                  className={`p-1.5 rounded-lg hover:bg-brand-50 transition-colors ${
                    p.is_available ? "text-green-500" : "text-red-400"
                  }`}
                  title={p.is_available ? "Disable product" : "Enable product"}
                >
                  {p.is_available ? (
                    <ToggleRight className="w-5 h-5" />
                  ) : (
                    <ToggleLeft className="w-5 h-5" />
                  )}
                </button>
                <button
                  onClick={() => deleteProduct(p.id)}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                  title="Delete product"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
