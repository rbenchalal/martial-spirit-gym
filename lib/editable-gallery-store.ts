import { editableGallery, type EditableGalleryItem } from "@/lib/editable-gallery";

let galleryState: EditableGalleryItem[] = [...editableGallery];

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

// Lecture de la galerie dynamique (version locale, en memoire).
export function readEditableGallery(): EditableGalleryItem[] {
  return cloneGallery(galleryState);
}

// Ecriture complete de la galerie dynamique (version locale, en memoire).
export function writeEditableGallery(nextGallery: EditableGalleryItem[]): EditableGalleryItem[] {
  galleryState = cloneGallery(nextGallery).map(normalizeItem);
  return readEditableGallery();
}

// Mise a jour partielle pratique pour une future persistance reelle.
export function updateEditableGallery(
  updater: (current: EditableGalleryItem[]) => EditableGalleryItem[],
): EditableGalleryItem[] {
  const current = readEditableGallery();
  const updated = updater(current);
  return writeEditableGallery(updated);
}
