import { kv } from "@vercel/kv";
import { editableGallery, type EditableGalleryItem } from "@/lib/editable-gallery";

const EDITABLE_GALLERY_KV_KEY = "admin:gallery";

function cloneGallery(items: EditableGalleryItem[]): EditableGalleryItem[] {
  return items.map((item) => ({ ...item }));
}

function normalizeItem(item: EditableGalleryItem): EditableGalleryItem {
  return {
    url: item.url.trim(),
    type: item.type,
    title: item.title.trim(),
    alt: item.alt.trim(),
  };
}

function isValidGalleryItem(item: unknown): item is EditableGalleryItem {
  if (!item || typeof item !== "object") {
    return false;
  }

  const candidate = item as EditableGalleryItem;
  return (
    typeof candidate.url === "string" &&
    (candidate.type === "image" || candidate.type === "video") &&
    typeof candidate.title === "string" &&
    typeof candidate.alt === "string"
  );
}

function normalizeGallery(items: EditableGalleryItem[]): EditableGalleryItem[] {
  return cloneGallery(items).map(normalizeItem);
}

// Lecture de la galerie dynamique depuis KV/Redis.
export async function readEditableGallery(): Promise<EditableGalleryItem[]> {
  const stored = await kv.get<unknown>(EDITABLE_GALLERY_KV_KEY);
  if (!Array.isArray(stored)) {
    return cloneGallery(editableGallery);
  }

  const validItems = stored.filter(isValidGalleryItem);
  return normalizeGallery(validItems);
}

// Ecriture complete de la galerie dynamique dans KV/Redis.
export async function writeEditableGallery(
  nextGallery: EditableGalleryItem[],
): Promise<EditableGalleryItem[]> {
  const normalized = normalizeGallery(nextGallery);
  await kv.set(EDITABLE_GALLERY_KV_KEY, normalized);
  return normalized;
}

// Mise a jour partielle pratique pour une future persistance reelle.
export async function updateEditableGallery(
  updater: (current: EditableGalleryItem[]) => EditableGalleryItem[],
): Promise<EditableGalleryItem[]> {
  const current = await readEditableGallery();
  const updated = updater(current);
  return writeEditableGallery(updated);
}
