export const PRODUCT_CATEGORIES = [
  "hat",
  "glasses",
  "earrings",
  "necklace",
  "top",
  "outerwear",
  "bottoms",
  "shoes",
  "bag",
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export type ProductItem = {
  id: string;
  category: ProductCategory;
  url: string;
  name: string;
  brand?: string;
  imageUrl?: string;
  price?: number;
  currency: string;
  notes?: string;
  source?: "url" | "manual";
};

export type Equipment = Partial<Record<ProductCategory, ProductItem>>;

export type BackgroundPreset = "blush-studio" | "botanical" | "warm-office" | "neutral-gallery";
export type MakeupPreset = "natural" | "soft-glam" | "bold";

export type CharacterBuild = {
  id: string;
  characterName: string;
  buildName: string;
  background: BackgroundPreset;
  makeup: MakeupPreset;
  equipment: Equipment;
  createdAt: string;
};

export type ProductInspection = {
  url: string;
  name?: string;
  brand?: string;
  imageUrl?: string;
  price?: number;
  currency?: string;
  warning?: string;
};
