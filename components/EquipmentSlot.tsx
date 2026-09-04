import type { CSSProperties } from "react";
import type { ProductCategory, ProductItem } from "@/lib/types";

const LABELS: Record<ProductCategory, string> = {
  hat: "Hat",
  glasses: "Glasses",
  earrings: "Earrings",
  necklace: "Necklace",
  top: "Top",
  outerwear: "Outerwear",
  bottoms: "Bottoms",
  shoes: "Shoes",
  bag: "Bag",
};

type Props = {
  category: ProductCategory;
  item?: ProductItem;
  style?: CSSProperties;
  onClick: () => void;
};

export function EquipmentSlot({ category, item, style, onClick }: Props) {
  return (
    <button className={`equipment-slot ${item ? "is-equipped" : ""}`} style={style} onClick={onClick}>
      <span className="slot-label">{LABELS[category]}</span>
      <span className="slot-value">{item?.name ?? "+ Add item"}</span>
      {typeof item?.price === "number" && (
        <span className="slot-price">{item.currency} {item.price.toFixed(2)}</span>
      )}
    </button>
  );
}
