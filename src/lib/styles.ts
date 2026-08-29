import type { StyleProfile } from "./types";

export const minimalistStyle: StyleProfile = {
  id: "style-minimalist",
  name: "Minimalist",
  slug: "minimalist",
  description:
    "Clean lines, neutral tones, and purposeful pieces. Every item earns its place. Less is more — open space is a design element.",
  heroImageUrl:
    "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=1200&q=80",
  colorPalette: {
    primary: ["#FFFFFF", "#F5F5F5", "#E0E0E0", "#9E9E9E"],
    accent: ["#212121", "#424242", "#616161"],
    avoid: ["#FFD700", "#FF6347", "#FF1493"],
  },
  materials: ["wood", "metal", "glass", "leather", "concrete", "linen"],
  furnitureCharacteristics: {
    profile: "low-to-medium height",
    legs: "slim, tapered, or hidden",
    ornamentation: "none",
    lines: "straight and clean",
    surfaces: "smooth and matte",
  },
  lightingPreference: "natural with warm accent lighting",
  maxItemsPerSqm: 0.6,
  categoryRequirements: {
    bedroom: ["bed", "nightstand", "dresser", "lighting", "rug"],
    living_room: ["sofa", "coffee-table", "tv-unit", "lighting", "rug"],
    dining_room: ["dining-table", "chairs", "lighting", "sideboard"],
    office: ["desk", "chair", "storage", "lighting"],
    studio: ["sofa", "bed", "desk", "storage", "lighting"],
    kids_room: ["bed", "storage", "desk", "rug", "lighting"],
  },
};

export const japandiStyle: StyleProfile = {
  id: "style-japandi",
  name: "Japandi",
  slug: "japandi",
  description:
    "Where Japanese wabi-sabi meets Scandinavian hygge. Natural materials, warm neutrals, organic textures, and serene simplicity create a calm sanctuary.",
  heroImageUrl:
    "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1200&q=80",
  colorPalette: {
    primary: ["#F5F0EB", "#E8DDD3", "#D4C5B5", "#C4A882"],
    accent: ["#8B7355", "#6B5B45", "#4A4035", "#2C2418"],
    avoid: ["#FF0000", "#FFD700", "#00FF00", "#FF69B4"],
  },
  materials: [
    "natural-wood",
    "bamboo",
    "rattan",
    "linen",
    "cotton",
    "ceramic",
    "stone",
    "paper",
  ],
  furnitureCharacteristics: {
    profile: "low-to-ground",
    legs: "tapered or hairpin",
    ornamentation: "none to minimal",
    lines: "clean with organic curves",
    surfaces: "natural textures and matte finishes",
  },
  lightingPreference: "warm diffused lighting with paper or fabric shades",
  maxItemsPerSqm: 0.7,
  categoryRequirements: {
    bedroom: ["bed", "nightstand", "dresser", "lighting", "rug", "decor"],
    living_room: [
      "sofa",
      "coffee-table",
      "tv-unit",
      "lighting",
      "rug",
      "decor",
    ],
    dining_room: [
      "dining-table",
      "chairs",
      "lighting",
      "sideboard",
      "decor",
    ],
    office: ["desk", "chair", "storage", "lighting", "decor"],
    studio: ["sofa", "bed", "desk", "storage", "lighting"],
    kids_room: ["bed", "storage", "desk", "rug", "lighting"],
  },
};

export const styles: StyleProfile[] = [minimalistStyle, japandiStyle];

export function getStyleBySlug(slug: string): StyleProfile | undefined {
  return styles.find((s) => s.slug === slug);
}
