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

export const styles: StyleProfile[] = [
  minimalistStyle,
  japandiStyle,
  {
    id: "style-modern",
    name: "Modern",
    slug: "modern",
    description:
      "Bold geometric forms, mixed materials, and contemporary finishes. Think polished concrete, brushed metal, and statement lighting.",
    heroImageUrl:
      "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1200&q=80",
    colorPalette: {
      primary: ["#F5F5F5", "#E0E0E0", "#9E9E9E", "#616161"],
      accent: ["#1565C0", "#0D47A1", "#FF6F00", "#212121"],
      avoid: ["#FF69B4", "#FFD700", "#00FF00"],
    },
    materials: ["metal", "glass", "concrete", "leather", "lacquer", "marble"],
    furnitureCharacteristics: {
      profile: "medium height with bold silhouettes",
      legs: "geometric or hidden",
      ornamentation: "minimal to none",
      lines: "clean geometric with curves",
      surfaces: "polished, glossy, or matte contrast",
    },
    lightingPreference: "statement pendant lighting with warm LED accents",
    maxItemsPerSqm: 0.65,
    categoryRequirements: {
      bedroom: ["bed", "nightstand", "dresser", "lighting", "rug"],
      living_room: ["sofa", "coffee-table", "tv-unit", "lighting", "rug"],
      dining_room: ["dining-table", "chairs", "lighting"],
      office: ["desk", "chair", "storage", "lighting"],
      studio: ["sofa", "bed", "desk", "storage", "lighting"],
      kids_room: ["bed", "storage", "desk", "rug", "lighting"],
    },
  },
  {
    id: "style-industrial",
    name: "Industrial",
    slug: "industrial",
    description:
      "Raw, unfinished aesthetic with exposed materials. Brick walls, metal pipes, reclaimed wood, and Edison bulbs define this urban loft style.",
    heroImageUrl:
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&q=80",
    colorPalette: {
      primary: ["#424242", "#616161", "#9E9E9E", "#BDBDBD"],
      accent: ["#5D4037", "#795548", "#3E2723", "#FF8F00"],
      avoid: ["#FF69B4", "#E1BEE7", "#B2DFDB"],
    },
    materials: ["reclaimed-wood", "iron", "steel", "brick", "leather", "concrete"],
    furnitureCharacteristics: {
      profile: "sturdy and utilitarian",
      legs: "iron pipe, hairpin, or cast iron",
      ornamentation: "functional hardware as decoration",
      lines: "angular and robust",
      surfaces: "distressed, raw, weathered",
    },
    lightingPreference: "exposed Edison bulbs, metal cage fixtures, and warm industrial pendants",
    maxItemsPerSqm: 0.55,
    categoryRequirements: {
      bedroom: ["bed", "nightstand", "dresser", "lighting"],
      living_room: ["sofa", "coffee-table", "tv-unit", "lighting", "rug"],
      dining_room: ["dining-table", "chairs", "lighting"],
      office: ["desk", "chair", "storage", "lighting"],
      studio: ["sofa", "bed", "desk", "storage", "lighting"],
      kids_room: ["bed", "storage", "desk", "lighting"],
    },
  },
  {
    id: "style-bohemian",
    name: "Bohemian",
    slug: "bohemian",
    description:
      "Eclectic, layered, and globally inspired. Rich patterns, woven textiles, plants, and curated collections create a warm, lived-in sanctuary.",
    heroImageUrl:
      "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1200&q=80",
    colorPalette: {
      primary: ["#FFF8E1", "#FFECB3", "#D7CCC8", "#A1887F"],
      accent: ["#E65100", "#BF360C", "#1B5E20", "#4A148C"],
      avoid: ["#212121", "#616161", "#CFD8DC"],
    },
    materials: ["rattan", "macrame", "cotton", "wool", "terracotta", "wood"],
    furnitureCharacteristics: {
      profile: "low and relaxed with mixed heights",
      legs: "turned wood, carved, or floor-level",
      ornamentation: "fringe, tassels, embroidery",
      lines: "organic and curvy",
      surfaces: "textured, woven, and layered",
    },
    lightingPreference: "warm layered lighting with Moroccan lanterns, string lights, and candle glow",
    maxItemsPerSqm: 0.8,
    categoryRequirements: {
      bedroom: ["bed", "nightstand", "rug", "lighting", "decor"],
      living_room: ["sofa", "coffee-table", "lighting", "rug", "decor"],
      dining_room: ["dining-table", "chairs", "lighting", "decor"],
      office: ["desk", "chair", "storage", "lighting"],
      studio: ["sofa", "bed", "desk", "lighting", "decor"],
      kids_room: ["bed", "storage", "rug", "lighting"],
    },
  },
  {
    id: "style-coastal",
    name: "Coastal",
    slug: "coastal",
    description:
      "Light, breezy, and inspired by the sea. Whites, sandy neutrals, and ocean blues paired with natural textures create a relaxed beachside feel.",
    heroImageUrl:
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=1200&q=80",
    colorPalette: {
      primary: ["#FFFFFF", "#F5F5F5", "#E3F2FD", "#BBDEFB"],
      accent: ["#0277BD", "#01579B", "#00838F", "#4DB6AC"],
      avoid: ["#212121", "#4A148C", "#BF360C"],
    },
    materials: ["light-wood", "linen", "cotton", "jute", "wicker", "ceramic"],
    furnitureCharacteristics: {
      profile: "light and airy with medium height",
      legs: "slim and tapered",
      ornamentation: "nautical accents and natural textures",
      lines: "soft and relaxed",
      surfaces: "washed, weathered, and matte",
    },
    lightingPreference: "bright natural light with woven pendants and glass lanterns",
    maxItemsPerSqm: 0.6,
    categoryRequirements: {
      bedroom: ["bed", "nightstand", "dresser", "lighting", "rug"],
      living_room: ["sofa", "coffee-table", "lighting", "rug"],
      dining_room: ["dining-table", "chairs", "lighting"],
      office: ["desk", "chair", "storage", "lighting"],
      studio: ["sofa", "bed", "desk", "storage", "lighting"],
      kids_room: ["bed", "storage", "desk", "lighting"],
    },
  },
];

export function getStyleBySlug(slug: string): StyleProfile | undefined {
  return styles.find((s) => s.slug === slug);
}
