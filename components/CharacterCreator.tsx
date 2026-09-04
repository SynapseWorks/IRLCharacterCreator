"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { CharacterStats } from "./CharacterStats";
import { EquipmentSlot } from "./EquipmentSlot";
import { ProductDrawer } from "./ProductDrawer";
import type { BackgroundPreset, CharacterBuild, Equipment, MakeupPreset, ProductCategory, ProductItem } from "@/lib/types";
import { PRODUCT_CATEGORIES } from "@/lib/types";
import { calculateStats, formatMoney } from "@/lib/stats";

const SLOT_POSITIONS: Record<ProductCategory, { left: string; top: string }> = {
  hat: { left: "3%", top: "7%" },
  glasses: { left: "1%", top: "24%" },
  earrings: { left: "4%", top: "41%" },
  necklace: { left: "5%", top: "59%" },
  top: { left: "74%", top: "17%" },
  outerwear: { left: "77%", top: "34%" },
  bottoms: { left: "76%", top: "51%" },
  shoes: { left: "73%", top: "71%" },
  bag: { left: "4%", top: "76%" },
};

const BACKGROUNDS: { id: BackgroundPreset; label: string }[] = [
  { id: "blush-studio", label: "Blush studio" },
  { id: "botanical", label: "Botanical room" },
  { id: "warm-office", label: "Warm office" },
  { id: "neutral-gallery", label: "Neutral gallery" },
];

const MAKEUP: { id: MakeupPreset; label: string }[] = [
  { id: "natural", label: "Natural" },
  { id: "soft-glam", label: "Soft glam" },
  { id: "bold", label: "Bold" },
];

const STORAGE_KEY = "irlcc:saved-builds:v0";

export function CharacterCreator() {
  const [characterName, setCharacterName] = useState("My Character");
  const [buildName, setBuildName] = useState("Everyday Creative");
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [background, setBackground] = useState<BackgroundPreset>("blush-studio");
  const [makeup, setMakeup] = useState<MakeupPreset>("natural");
  const [equipment, setEquipment] = useState<Equipment>({});
  const [activeCategory, setActiveCategory] = useState<ProductCategory | null>(null);
  const [savedBuilds, setSavedBuilds] = useState<CharacterBuild[]>([]);
  const [renderMessage, setRenderMessage] = useState("");
  const stats = useMemo(() => calculateStats(equipment), [equipment]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setSavedBuilds(JSON.parse(stored));
    } catch {
      // Ignore corrupt/local-storage-disabled state in prototype mode.
    }
  }, []);

  function onPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (photoUrl.startsWith("blob:")) URL.revokeObjectURL(photoUrl);
    setPhotoUrl(URL.createObjectURL(file));
    setRenderMessage("");
  }

  function equip(item: ProductItem) {
    setEquipment((current) => ({ ...current, [item.category]: item }));
    setRenderMessage("");
  }

  function remove(category: ProductCategory) {
    setEquipment((current) => {
      const next = { ...current };
      delete next[category];
      return next;
    });
    setActiveCategory(null);
    setRenderMessage("");
  }

  function saveBuild() {
    const build: CharacterBuild = {
      id: crypto.randomUUID(),
      characterName: characterName.trim() || "My Character",
      buildName: buildName.trim() || "Untitled Build",
      background,
      makeup,
      equipment,
      createdAt: new Date().toISOString(),
    };
    const next = [build, ...savedBuilds].slice(0, 12);
    setSavedBuilds(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function loadBuild(build: CharacterBuild) {
    setCharacterName(build.characterName);
    setBuildName(build.buildName);
    setBackground(build.background);
    setMakeup(build.makeup);
    setEquipment(build.equipment);
    setRenderMessage("Build loaded. Upload a base photo for this session if needed.");
  }

  async function generatePreview() {
    setRenderMessage("Building render plan…");
    const response = await fetch("/api/render", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ characterName, buildName, background, makeup, equipment, hasPhoto: Boolean(photoUrl) }),
    });
    const data = await response.json();
    setRenderMessage(data.message ?? "Render plan ready.");
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <div className="brand-mark">IRL</div>
          <div><h1>Character Creator</h1><p>Equip the version of you you want to meet.</p></div>
        </div>
        <div className="topbar-actions">
          <button className="secondary-button" onClick={saveBuild}>Save build</button>
          <button className="primary-button" onClick={generatePreview}>Generate look ✨</button>
        </div>
      </header>

      <section className="identity-bar">
        <label>Character name<input value={characterName} onChange={(e) => setCharacterName(e.target.value)} /></label>
        <label>Build name<input value={buildName} onChange={(e) => setBuildName(e.target.value)} /></label>
        <label className="upload-button">Base photo<input type="file" accept="image/png,image/jpeg,image/webp" onChange={onPhoto} /><span>{photoUrl ? "Change photo" : "Upload photo"}</span></label>
      </section>

      <div className="creator-grid">
        <section className="stage-card">
          <div className="character-title"><span>{characterName || "My Character"}</span><small>{buildName || "Untitled Build"}</small></div>
          <div className={`character-stage background-${background}`}>
            <div className="avatar-frame">
              {photoUrl ? <img src={photoUrl} alt={`${characterName} base`} /> : <div className="avatar-placeholder"><span>＋</span><strong>Upload your character photo</strong><small>A clear, well-lit full or ¾-body photo works best.</small></div>}
            </div>
            {PRODUCT_CATEGORIES.map((category) => (
              <EquipmentSlot key={category} category={category} item={equipment[category]} style={SLOT_POSITIONS[category]} onClick={() => setActiveCategory(category)} />
            ))}
          </div>
          {renderMessage && <div className="render-message">{renderMessage}</div>}
        </section>

        <aside className="control-rail">
          <CharacterStats equipment={equipment} />

          <section className="control-card">
            <div className="section-eyebrow">Scene</div>
            <h2>Background</h2>
            <div className="choice-grid">{BACKGROUNDS.map((option) => <button key={option.id} className={background === option.id ? "selected" : ""} onClick={() => setBackground(option.id)}>{option.label}</button>)}</div>
          </section>

          <section className="control-card">
            <div className="section-eyebrow">Styling</div>
            <h2>Makeup direction</h2>
            <div className="choice-grid">{MAKEUP.map((option) => <button key={option.id} className={makeup === option.id ? "selected" : ""} onClick={() => setMakeup(option.id)}>{option.label}</button>)}</div>
          </section>

          <section className="control-card">
            <div className="section-eyebrow">Budget snapshot</div>
            <h2>{formatMoney(stats.total, stats.currency)}</h2>
            <p>{stats.pricedCount} priced item{stats.pricedCount === 1 ? "" : "s"} in this build.</p>
          </section>
        </aside>
      </div>

      <section className="saved-section">
        <div><div className="section-eyebrow">Wardrobe timeline</div><h2>Saved builds</h2></div>
        <div className="saved-builds">
          {savedBuilds.length === 0 && <p className="empty-copy">Save a build and it will appear here for quick comparison.</p>}
          {savedBuilds.map((build) => {
            const buildStats = calculateStats(build.equipment);
            return <button key={build.id} className="saved-build" onClick={() => loadBuild(build)}><strong>{build.characterName}</strong><span>{build.buildName}</span><small>{formatMoney(buildStats.total, buildStats.currency)} · {buildStats.equippedCount} items</small></button>;
          })}
        </div>
      </section>

      {activeCategory && (
        <ProductDrawer
          category={activeCategory}
          item={equipment[activeCategory]}
          onClose={() => setActiveCategory(null)}
          onSave={equip}
          onRemove={() => remove(activeCategory)}
        />
      )}
    </main>
  );
}
