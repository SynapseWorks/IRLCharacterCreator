import type { Equipment, ProductItem } from "./types";

export function pricedItems(equipment: Equipment): ProductItem[] {
  return Object.values(equipment).filter(
    (item): item is ProductItem => Boolean(item && typeof item.price === "number"),
  );
}

export function calculateStats(equipment: Equipment) {
  const equipped = Object.values(equipment).filter(Boolean) as ProductItem[];
  const priced = pricedItems(equipment);
  const total = priced.reduce((sum, item) => sum + (item.price ?? 0), 0);
  const average = priced.length ? total / priced.length : 0;
  const mostExpensive = priced.reduce<ProductItem | undefined>(
    (highest, item) => (!highest || (item.price ?? 0) > (highest.price ?? 0) ? item : highest),
    undefined,
  );
  const currencies = Array.from(new Set(priced.map((item) => item.currency || "CAD")));

  return {
    equippedCount: equipped.length,
    pricedCount: priced.length,
    total,
    average,
    mostExpensive,
    currency: currencies.length === 1 ? currencies[0] : "MIXED",
  };
}

export function formatMoney(value: number, currency = "CAD") {
  if (currency === "MIXED") return `${value.toFixed(2)} mixed`;
  try {
    return new Intl.NumberFormat("en-CA", { style: "currency", currency }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}
