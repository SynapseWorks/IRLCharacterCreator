"use client";

import { useEffect, useState } from "react";
import type { ProductCategory, ProductInspection, ProductItem } from "@/lib/types";

type Props = {
  category: ProductCategory;
  item?: ProductItem;
  onClose: () => void;
  onSave: (item: ProductItem) => void;
  onRemove: () => void;
};

const label = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export function ProductDrawer({ category, item, onClose, onSave, onRemove }: Props) {
  const [url, setUrl] = useState(item?.url ?? "");
  const [name, setName] = useState(item?.name ?? "");
  const [brand, setBrand] = useState(item?.brand ?? "");
  const [imageUrl, setImageUrl] = useState(item?.imageUrl ?? "");
  const [price, setPrice] = useState(item?.price?.toString() ?? "");
  const [currency, setCurrency] = useState(item?.currency ?? "CAD");
  const [notes, setNotes] = useState(item?.notes ?? "");
  const [loading, setLoading] = useState(false);
  const [warning, setWarning] = useState("");

  useEffect(() => {
    setUrl(item?.url ?? "");
    setName(item?.name ?? "");
    setBrand(item?.brand ?? "");
    setImageUrl(item?.imageUrl ?? "");
    setPrice(item?.price?.toString() ?? "");
    setCurrency(item?.currency ?? "CAD");
    setNotes(item?.notes ?? "");
    setWarning("");
  }, [category, item]);

  async function inspectUrl() {
    if (!url) return;
    setLoading(true);
    setWarning("");
    try {
      const response = await fetch("/api/products/inspect", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await response.json()) as ProductInspection & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not inspect this product page.");
      if (data.name) setName(data.name);
      if (data.brand) setBrand(data.brand);
      if (data.imageUrl) setImageUrl(data.imageUrl);
      if (typeof data.price === "number") setPrice(data.price.toString());
      if (data.currency) setCurrency(data.currency);
      if (data.warning) setWarning(data.warning);
    } catch (error) {
      setWarning(error instanceof Error ? error.message : "Could not inspect the URL. You can enter details manually.");
    } finally {
      setLoading(false);
    }
  }

  function save() {
    if (!name.trim()) {
      setWarning("Give the item a name before equipping it.");
      return;
    }
    const parsedPrice = price.trim() === "" ? undefined : Number(price);
    if (parsedPrice !== undefined && (!Number.isFinite(parsedPrice) || parsedPrice < 0)) {
      setWarning("Price must be a positive number.");
      return;
    }
    onSave({
      id: item?.id ?? crypto.randomUUID(),
      category,
      url: url.trim(),
      name: name.trim(),
      brand: brand.trim() || undefined,
      imageUrl: imageUrl.trim() || undefined,
      price: parsedPrice,
      currency: currency.trim().toUpperCase() || "CAD",
      notes: notes.trim() || undefined,
      source: url.trim() ? "url" : "manual",
    });
    onClose();
  }

  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="product-drawer" role="dialog" aria-modal="true" aria-label={`${label(category)} item editor`}>
        <div className="drawer-header">
          <div><div className="section-eyebrow">Equip slot</div><h2>{label(category)}</h2></div>
          <button className="icon-button" onClick={onClose} aria-label="Close">×</button>
        </div>

        <label>Product URL
          <div className="url-row">
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
            <button className="secondary-button" onClick={inspectUrl} disabled={!url || loading}>{loading ? "Reading…" : "Read URL"}</button>
          </div>
        </label>
        <p className="helper-text">We try JSON-LD/OpenGraph metadata first. Retailers may block automated reads, so every field stays editable.</p>

        <label>Item name<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Champagne clear glasses" /></label>
        <label>Brand<input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Optional" /></label>
        <div className="two-column">
          <label>Price<input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="49.95" /></label>
          <label>Currency<input value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="CAD" maxLength={3} /></label>
        </div>
        <label>Product image URL<input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="Optional direct image URL" /></label>
        <label>Notes<textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Colour, size, why it works…" rows={3} /></label>

        {imageUrl && <div className="product-image-preview" style={{ backgroundImage: `url(${imageUrl})` }} aria-label="Product image preview" />}
        {warning && <p className="warning-text">{warning}</p>}

        <div className="drawer-actions">
          {item && <button className="danger-button" onClick={onRemove}>Remove</button>}
          <span />
          <button className="secondary-button" onClick={onClose}>Cancel</button>
          <button className="primary-button" onClick={save}>Equip item</button>
        </div>
      </aside>
    </div>
  );
}
