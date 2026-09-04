import type { User } from "@supabase/supabase-js";
import type { BackgroundPreset, CharacterBuild, Equipment, MakeupPreset, ProductItem } from "@/lib/types";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type SaveBuildInput = {
  user: User;
  characterName: string;
  buildName: string;
  background: BackgroundPreset;
  makeup: MakeupPreset;
  equipment: Equipment;
  basePhotoDataUrl?: string;
};

type RemoteCharacter = {
  id: string;
  name: string;
  base_photo_path: string | null;
};

type RemoteBuild = {
  id: string;
  character_id: string;
  name: string;
  background_preset: BackgroundPreset;
  makeup_preset: MakeupPreset;
  created_at: string;
};

type RemoteBuildItem = {
  build_id: string;
  product_id: string;
  category: ProductItem["category"];
  notes: string | null;
};

type RemoteProduct = {
  id: string;
  source_url: string | null;
  name: string;
  brand: string | null;
  category: ProductItem["category"];
  image_url: string | null;
  price: number | string | null;
  currency: string | null;
};

function requireSupabase() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase is not configured in this app environment.");
  return supabase;
}

function merchantFromUrl(value: string | null) {
  if (!value) return null;
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read image."));
    reader.readAsDataURL(blob);
  });
}

async function ensureCharacter(user: User, characterName: string) {
  const supabase = requireSupabase();
  const normalizedName = characterName.trim() || "My Character";

  const { data: existing, error: findError } = await supabase
    .from("characters")
    .select("id,name,base_photo_path")
    .eq("user_id", user.id)
    .eq("name", normalizedName)
    .order("created_at", { ascending: true })
    .limit(1);

  if (findError) throw findError;
  if (existing?.[0]) return existing[0] as RemoteCharacter;

  const { data: created, error: createError } = await supabase
    .from("characters")
    .insert({ user_id: user.id, name: normalizedName })
    .select("id,name,base_photo_path")
    .single();

  if (createError) throw createError;
  return created as RemoteCharacter;
}

async function saveBasePhoto(user: User, character: RemoteCharacter, dataUrl?: string) {
  if (!dataUrl?.startsWith("data:image/")) return character.base_photo_path;

  const supabase = requireSupabase();
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const extension = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
  const path = `${user.id}/${character.id}/original.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("base-photos")
    .upload(path, blob, { upsert: true, contentType: blob.type || "image/jpeg" });
  if (uploadError) throw uploadError;

  const { error: updateError } = await supabase
    .from("characters")
    .update({ base_photo_path: path })
    .eq("id", character.id);
  if (updateError) throw updateError;

  return path;
}

async function insertProduct(user: User, item: ProductItem) {
  const supabase = requireSupabase();
  const sourceUrl = item.url?.trim() || null;
  const { data, error } = await supabase
    .from("products")
    .insert({
      user_id: user.id,
      source_url: sourceUrl,
      canonical_url: sourceUrl,
      merchant: merchantFromUrl(sourceUrl),
      name: item.name,
      brand: item.brand || null,
      category: item.category,
      image_url: item.imageUrl || null,
      price: typeof item.price === "number" ? item.price : null,
      currency: item.currency || "CAD",
      price_observed_at: typeof item.price === "number" ? new Date().toISOString() : null,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id as string;
}

export async function saveBuildToCloud(input: SaveBuildInput) {
  const supabase = requireSupabase();
  const character = await ensureCharacter(input.user, input.characterName);
  await saveBasePhoto(input.user, character, input.basePhotoDataUrl);

  const { data: build, error: buildError } = await supabase
    .from("builds")
    .insert({
      character_id: character.id,
      name: input.buildName.trim() || "Untitled Build",
      background_preset: input.background,
      makeup_preset: input.makeup,
    })
    .select("id")
    .single();
  if (buildError) throw buildError;

  for (const item of Object.values(input.equipment).filter(Boolean) as ProductItem[]) {
    const productId = await insertProduct(input.user, item);
    const { error } = await supabase.from("build_items").insert({
      build_id: build.id,
      product_id: productId,
      category: item.category,
      notes: item.notes || null,
    });
    if (error) throw error;
  }

  return build.id as string;
}

export async function loadCloudBuilds(user: User): Promise<CharacterBuild[]> {
  const supabase = requireSupabase();

  const { data: characters, error: characterError } = await supabase
    .from("characters")
    .select("id,name,base_photo_path")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });
  if (characterError) throw characterError;

  const typedCharacters = (characters ?? []) as RemoteCharacter[];
  if (!typedCharacters.length) return [];
  const characterIds = typedCharacters.map((character) => character.id);
  const characterNames = new Map(typedCharacters.map((character) => [character.id, character.name]));

  const { data: builds, error: buildError } = await supabase
    .from("builds")
    .select("id,character_id,name,background_preset,makeup_preset,created_at")
    .in("character_id", characterIds)
    .order("created_at", { ascending: false })
    .limit(24);
  if (buildError) throw buildError;

  const typedBuilds = (builds ?? []) as RemoteBuild[];
  if (!typedBuilds.length) return [];
  const buildIds = typedBuilds.map((build) => build.id);

  const { data: buildItems, error: itemsError } = await supabase
    .from("build_items")
    .select("build_id,product_id,category,notes")
    .in("build_id", buildIds);
  if (itemsError) throw itemsError;
  const typedBuildItems = (buildItems ?? []) as RemoteBuildItem[];

  const productIds = [...new Set(typedBuildItems.map((item) => item.product_id))];
  let typedProducts: RemoteProduct[] = [];
  if (productIds.length) {
    const { data: products, error: productError } = await supabase
      .from("products")
      .select("id,source_url,name,brand,category,image_url,price,currency")
      .in("id", productIds);
    if (productError) throw productError;
    typedProducts = (products ?? []) as RemoteProduct[];
  }

  const productById = new Map(typedProducts.map((product) => [product.id, product]));
  const itemsByBuild = new Map<string, Equipment>();

  for (const buildItem of typedBuildItems) {
    const product = productById.get(buildItem.product_id);
    if (!product) continue;
    const current = itemsByBuild.get(buildItem.build_id) ?? {};
    current[buildItem.category] = {
      id: product.id,
      category: buildItem.category,
      url: product.source_url ?? "",
      name: product.name,
      brand: product.brand ?? undefined,
      imageUrl: product.image_url ?? undefined,
      price: product.price === null ? undefined : Number(product.price),
      currency: product.currency ?? "CAD",
      notes: buildItem.notes ?? undefined,
      source: product.source_url ? "url" : "manual",
    };
    itemsByBuild.set(buildItem.build_id, current);
  }

  return typedBuilds.map((build) => ({
    id: build.id,
    characterName: characterNames.get(build.character_id) ?? "My Character",
    buildName: build.name,
    background: build.background_preset,
    makeup: build.makeup_preset,
    equipment: itemsByBuild.get(build.id) ?? {},
    createdAt: build.created_at,
  }));
}

export async function getCharacterBasePhotoDataUrl(user: User, characterName: string) {
  const supabase = requireSupabase();
  const { data: characters, error } = await supabase
    .from("characters")
    .select("base_photo_path")
    .eq("user_id", user.id)
    .eq("name", characterName)
    .not("base_photo_path", "is", null)
    .order("created_at", { ascending: true })
    .limit(1);
  if (error) throw error;

  const path = characters?.[0]?.base_photo_path as string | undefined;
  if (!path) return null;

  const { data, error: downloadError } = await supabase.storage
    .from("base-photos")
    .download(path);
  if (downloadError) throw downloadError;
  return blobToDataUrl(data);
}
