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
  schedule: [
    {
      title: "Boxe Thaïlandaise - Kids (8+)",
      slots: ["Lundi : 17h30 - 18h45", "Mercredi : 16h30 - 17h45"],
    },
    {
      title: "Boxe Thaïlandaise - Adultes",
      slots: ["Lundi : 19h00 - 20h30", "Vendredi : 18h30 - 20h00"],
    },
    {
      title: "MMA - Kids",
      slots: ["Samedi : 15h00 - 16h15"],
    },
    {
      title: "MMA - Adultes",
      slots: ["Samedi : 16h30 - 18h00"],
    },
  ],
  pricing: {
    collective: [
      {
        title: "Cours collectifs - Kids (8+)",
        lines: ["Trimestriel : 170 CHF", "Semestriel : 320 CHF", "Annuel : 600 CHF"],
        featured: true,
      },
      {
        title: "Cours collectifs - Adultes",
        lines: ["Trimestriel : 280 CHF", "Semestriel : 540 CHF", "Annuel : 990 CHF"],
        featured: false,
      },
    ],
    privateCourses: [
      {
        title: "Cours privés - Adultes",
        lines: ["Unité : 120 CHF", "5 cours : 550 CHF", "10 cours : 1000 CHF"],
        featured: false,
      },
      {
        title: "Cours privés - Kids",
        lines: ["Unité : 75 CHF", "5 cours : 350 CHF", "10 cours : 650 CHF"],
        featured: false,
      },
    ],
    cards10: [
      {
        title: "Carte 10 cours - Adultes",
        lines: ["250 CHF", "Valable 6 mois"],
        featured: false,
      },
      {
        title: "Carte 10 cours - Kids",
        lines: ["180 CHF", "Valable 6 mois"],
        featured: false,
      },
    ],
  },
  conditioning: {
    title: "Martial Spirit Conditioning",
    description:
      "Service complémentaire de préparation physique orienté développement athlétique, avec des séances construites pour renforcer le corps, le mental et la performance globale.",
  },
} as const;

export type EditableContent = typeof editableContent;
