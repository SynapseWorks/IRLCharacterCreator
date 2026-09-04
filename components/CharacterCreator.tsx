"use client";

import { type ChangeEvent, useEffect, useMemo, useState } from "react";
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

async function preparePhoto(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  if (file.size > 15 * 1024 * 1024) throw new Error("Please choose an image under 15 MB.");

  const bitmap = await createImageBitmap(file);
  const maxDimension = 1600;
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser could not prepare the image.");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  let result = canvas.toDataURL("image/jpeg", 0.88);
  if (result.length > 5_500_000) result = canvas.toDataURL("image/jpeg", 0.72);
  if (result.length > 5_500_000) throw new Error("The prepared image is still too large. Try a smaller photo.");
  return result;
}

export function CharacterCreator() {
  const [characterName, setCharacterName] = useState("My Character");
  const [buildName, setBuildName] = useState("Everyday Creative");
  const [basePhotoDataUrl, setBasePhotoDataUrl] = useState("");
  const [generatedImageUrl, setGeneratedImageUrl] = useState("");
  const [background, setBackground] = useState<BackgroundPreset>("blush-studio");
  const [makeup, setMakeup] = useState<MakeupPreset>("natural");
  const [equipment, setEquipment] = useState<Equipment>({});
  const [activeCategory, setActiveCategory] = useState<ProductCategory | null>(null);
  const [savedBuilds, setSavedBuilds] = useState<CharacterBuild[]>([]);
  const [renderMessage, setRenderMessage] = useState("");
  const [rendering, setRendering] = useState(false);
  const [renderConsent, setRenderConsent] = useState(false);
  const stats = useMemo(() => calculateStats(equipment), [equipment]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setSavedBuilds(JSON.parse(stored));
    } catch {
      // Ignore corrupt/local-storage-disabled state in prototype mode.
    }
  }, []);

  function invalidateRender() {
    setGeneratedImageUrl("");
    setRenderMessage("");
  }

  async function onPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setRenderMessage("Preparing photo…");
      const prepared = await preparePhoto(file);
      setBasePhotoDataUrl(prepared);
      setGeneratedImageUrl("");
      setRenderMessage("");
    } catch (error) {
      setRenderMessage(error instanceof Error ? error.message : "Could not prepare that photo.");
    }
  }

  function equip(item: ProductItem) {
    setEquipment((current) => ({ ...current, [item.category]: item }));
    invalidateRender();
  }

  function remove(category: ProductCategory) {
    setEquipment((current) => {
      const next = { ...current };
      delete next[category];
      return next;
    });
    setActiveCategory(null);
    invalidateRender();
  }

  function chooseBackground(value: BackgroundPreset) {
    setBackground(value);
    invalidateRender();
  }

  function chooseMakeup(value: MakeupPreset) {
    setMakeup(value);
    invalidateRender();
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
    setGeneratedImageUrl("");
    setRenderMessage("Build loaded. Your base photo stays only in this browser session in V0.");
  }

  async function generatePreview() {
    if (!basePhotoDataUrl) {
      setRenderMessage("Upload a base photo first.");
      return;
    }
    if (!renderConsent) {
      setRenderMessage("Please confirm the render privacy notice before generating.");
      return;
    }

    setRendering(true);
    setRenderMessage("Building your character render…");
    try {
      const response = await fetch("/api/render", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          characterName,
          buildName,
          background,
          makeup,
          equipment,
          basePhotoDataUrl,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Character rendering failed.");
      if (typeof data.imageDataUrl === "string") setGeneratedImageUrl(data.imageDataUrl);
      setRenderMessage(data.message ?? "Render plan ready.");
    } catch (error) {
      setRenderMessage(error instanceof Error ? error.message : "Character rendering failed.");
    } finally {
      setRendering(false);
    }
  }

  const displayedImage = generatedImageUrl || basePhotoDataUrl;

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <div className="brand-mark">IRL</div>
          <div><h1>Character Creator</h1><p>Equip the version of you you want to meet.</p></div>
        </div>
        <div className="topbar-actions">
          <button className="secondary-button" onClick={saveBuild}>Save build</button>
          <button className="primary-button" onClick={generatePreview} disabled={rendering}>{rendering ? "Generating…" : "Generate look ✨"}</button>
        </div>
      </header>

      <section className="identity-bar">
        <label>Character name<input value={characterName} onChange={(e) => setCharacterName(e.target.value)} /></label>
        <label>Build name<input value={buildName} onChange={(e) => setBuildName(e.target.value)} /></label>
        <label className="upload-button">Base photo<input type="file" accept="image/png,image/jpeg,image/webp" onChange={onPhoto} /><span>{basePhotoDataUrl ? "Change photo" : "Upload photo"}</span></label>
      </section>

      <div className="creator-grid">
        <section className="stage-card">
          <div className="character-title"><span>{characterName || "My Character"}</span><small>{buildName || "Untitled Build"}</small></div>
          <div className={`character-stage background-${background}`}>
            <div className="avatar-frame">
              {displayedImage ? <img src={displayedImage} alt={`${characterName} ${generatedImageUrl ? "generated look" : "base"}`} /> : <div className="avatar-placeholder"><span>＋</span><strong>Upload your character photo</strong><small>A clear, well-lit full or ¾-body photo works best.</small></div>}
              {generatedImageUrl && <span className="generated-badge">Generated look</span>}
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
            <div className="choice-grid">{BACKGROUNDS.map((option) => <button key={option.id} className={background === option.id ? "selected" : ""} onClick={() => chooseBackground(option.id)}>{option.label}</button>)}</div>
          </section>

          <section className="control-card">
            <div className="section-eyebrow">Styling</div>
            <h2>Makeup direction</h2>
            <div className="choice-grid">{MAKEUP.map((option) => <button key={option.id} className={makeup === option.id ? "selected" : ""} onClick={() => chooseMakeup(option.id)}>{option.label}</button>)}</div>
          </section>

          <section className="control-card">
            <div className="section-eyebrow">Render privacy</div>
            <h2>Before generating</h2>
            <label className="consent-row"><input type="checkbox" checked={renderConsent} onChange={(e) => setRenderConsent(e.target.checked)} /><span>I understand that Generate sends my prepared photo and equipped product references to the configured image provider. Saved V0 build metadata does not include my base photo.</span></label>
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
