export const editableContent = {
  hero: {
    title: "Boxe Thaïlandaise, MMA & Préparation physique à Gland",
    description:
      "Martial Spirit Gym est une école d'arts martiaux située à Gland, au cœur de la région de La Côte entre Nyon et Morges. Nous proposons des cours de boxe thaïlandaise (Muay Thai), MMA et préparation physique pour enfants et adultes, du débutant au pratiquant confirmé.",
  },
  contact: {
    phone: "078 905 08 83",
    email: "martialspiritcoaching@gmail.com",
    address: "Route de Nyon 21 - Gland, Suisse",
  },
  socialLinks: [
    {
      platform: "instagram",
      label: "Instagram",
      href: "https://www.instagram.com/martialspiritcoaching/",
      ariaLabel: "Ouvrir le profil Instagram de Martial Spirit Gym",
    },
    {
      platform: "facebook",
      label: "Facebook",
      href: "https://www.facebook.com/share/1Af5ZKG2Z3/?mibextid=wwXIfr",
      ariaLabel: "Ouvrir le Facebook de Martial Spirit Gym",
    },
  ],
  conditioning: {
    title: "Martial Spirit Conditioning",
    description:
      "Service complémentaire de préparation physique orienté développement athlétique, avec des séances construites pour renforcer le corps, le mental et la performance globale.",
  },
} as const;

export type EditableContent = typeof editableContent;
