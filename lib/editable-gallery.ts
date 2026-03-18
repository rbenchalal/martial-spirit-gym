export type EditableGalleryMediaType = "image" | "video";

export type EditableGalleryItem = {
  url: string;
  type: EditableGalleryMediaType;
  title: string;
  alt: string;
};

// V2 admin: liste de medias Blob choisis pour la galerie publique.
// Cette structure est preparee pour une future integration cote site public.
export const editableGallery: EditableGalleryItem[] = [];
