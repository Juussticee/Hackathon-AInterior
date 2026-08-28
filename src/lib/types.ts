// ============================================================
// AInterior — Core Type Definitions
// ============================================================

// ---------- User Roles ----------
export type UserRole = "user" | "designer" | "company" | "admin";

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  createdAt: string;
}

// ---------- Companies ----------
export interface Company {
  id: string;
  name: string;
  slug: string;
  website: string | null;
  logoUrl: string | null;
  enabled: boolean;
  createdAt: string;
}

// ---------- Products ----------
export interface Product {
  id: string;
  name: string;
  companyId: string;
  sku: string | null;
  category: string;
  subcategory: string;
  priceAed: number;
  originalPriceAed: number | null;
  currency: string;
  productUrl: string;
  affiliateUrl: string | null;
  mainImageUrl: string;
  galleryUrls: string[];
  lengthCm: number | null;
  widthCm: number | null;
  heightCm: number | null;
  materials: string | null;
  colors: string[];
  description: string | null;
  styleTags: string[];
  roomTypes: string[];
  minRoomAreaSqm: number | null;
  priceTier: "economy" | "moderate" | "premium";
  isAvailable: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
}

// ---------- Styles ----------
export interface StyleProfile {
  id: string;
  name: string;
  slug: string;
  description: string;
  heroImageUrl: string;
  colorPalette: {
    primary: string[];
    accent: string[];
    avoid: string[];
  };
  materials: string[];
  furnitureCharacteristics: Record<string, string>;
  lightingPreference: string;
  maxItemsPerSqm: number;
  categoryRequirements: Record<string, string[]>;
}

// ---------- Room Types ----------
export type RoomType =
  | "bedroom"
  | "living_room"
  | "dining_room"
  | "office"
  | "studio"
  | "kids_room";

// ---------- Design Projects ----------
export interface DesignProject {
  id: string;
  userId: string;
  title: string | null;
  roomType: RoomType;
  roomImageUrl: string | null;
  roomLengthCm: number;
  roomWidthCm: number;
  roomHeightCm: number | null;
  existingFurniture: string | null;
  additionalRequirements: string | null;
  styleSlug: string;
  budgetAed: number;
  budgetTier: "economy" | "moderate" | "premium";
  status: "draft" | "processing" | "completed" | "failed";
  spaceAnalysis: SpaceAnalysis | null;
  selectedProducts: SelectedProduct[] | null;
  visualizationUrl: string | null;
  designExplanation: string | null;
  totalCostAed: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface SpaceAnalysis {
  roomType: string;
  estimatedAreaSqm: number;
  shape: string;
  walls: WallInfo[];
  existingFurniture: ExistingFurniture[];
  floorType: string;
  lighting: string;
  availableWallSpaceSqm: number;
  constraints: string[];
}

export interface WallInfo {
  id: string;
  lengthM: number;
  hasWindow: boolean;
  windowWidthM?: number;
  hasDoor: boolean;
  doorWidthM?: number;
}

export interface ExistingFurniture {
  type: string;
  approximateSize: string;
  position: string;
}

export interface SelectedProduct {
  productId: string;
  reason: string;
  category: string;
}

// ---------- Currency ----------
export type Currency = "AED" | "USD";

export interface CurrencyState {
  currency: Currency;
  rate: number; // 1 AED = rate USD
}

// ---------- Language ----------
export type Language = "en" | "ar";

// ---------- API Responses ----------
export interface DesignResult {
  spaceAnalysis: SpaceAnalysis;
  selectedProducts: (SelectedProduct & { product: Product })[];
  visualizationUrl: string | null;
  designExplanation: string;
  totalCostAed: number;
  totalCostUsd: number;
}
