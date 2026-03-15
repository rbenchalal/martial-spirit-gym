export const siteData = {
  name: "Martial Spirit Gym",
  city: "Gland",
  disciplines: "Boxe Thaïlandaise & MMA",
  audience: "Kids dès 8 ans",
  hero: {
    badge: "Martial Spirit Gym",
    title: "Boxe Thaïlandaise & MMA à Gland pour Kids et Adultes",
    description:
      "École d'arts martiaux dédiée à la boxe thaïlandaise et au MMA. Cours pour enfants dès 8 ans, adultes, débutants et pratiquants confirmés.",
    primaryCta: { label: "Voir le planning", href: "#planning" },
    secondaryCta: { label: "Voir les tarifs", href: "#tarifs" },
    highlights: [
      { label: "Public", value: "Kids dès 8 ans" },
      { label: "Disciplines", value: "Muay Thaï & MMA" },
      { label: "Cours", value: "Collectifs & privés" },
      { label: "Lieu", value: "Gland, Suisse" },
    ],
  },
  about: {
    title: "Un club d'arts martiaux structuré et exigeant",
    text: "Notre approche allie technique, discipline et progression durable. Chaque séance est construite pour développer la confiance, la condition physique et la maîtrise, dans une ambiance respectueuse et motivante.",
    points: [
      "Encadrement pédagogique pour tous niveaux",
      "Approche technique orientée progression",
      "Ambiance sérieuse, bienveillante et dynamique",
    ],
  },
  disciplineCards: [
    {
      title: "Boxe Thaïlandaise",
      description:
        "Travail complet des frappes, déplacements, timing et conditionnement spécifique.",
    },
    {
      title: "MMA",
      description:
        "Combinaison striking, lutte et contrôle pour une pratique moderne et polyvalente.",
    },
    {
      title: "Cours privés",
      description:
        "Accompagnement individualisé pour accélérer votre progression technique.",
    },
  ],
  audienceCards: [
    {
      title: "Kids (dès 8 ans)",
      description:
        "Cours adaptés à l'âge pour apprendre discipline, coordination et confiance.",
    },
    {
      title: "Adultes débutants",
      description:
        "Un cadre progressif pour apprendre les bases avec méthode et sécurité.",
    },
    {
      title: "Pratiquants confirmés",
      description:
        "Séances exigeantes pour perfectionner technique, rythme et stratégie.",
    },
  ],
  benefits: [
    "Amélioration de la condition physique générale",
    "Renforcement de la confiance et de la discipline",
    "Progression technique mesurable",
    "Esprit d'équipe et respect des partenaires",
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
  pricing: [
    {
      title: "Cours collectifs Kids",
      featured: true,
      lines: ["Trimestriel : 170 CHF", "Semestriel : 320 CHF", "Annuel : 600 CHF"],
    },
    {
      title: "Cours collectifs Adultes",
      featured: false,
      lines: ["Trimestriel : 280 CHF", "Semestriel : 540 CHF", "Annuel : 990 CHF"],
    },
    {
      title: "Carte 10 cours Adultes",
      featured: false,
      lines: ["250 CHF", "Valable 6 mois"],
    },
  ],
  gallery: [
    "Séance technique de boxe thaïlandaise",
    "Entraînement MMA collectif",
    "Cours kids encadré",
    "Travail de pads et cardio",
    "Préparation physique",
    "Coaching privé",
  ],
  faq: [
    {
      question: "À partir de quel âge peut-on commencer ?",
      answer:
        "Les cours kids sont accessibles dès 8 ans, avec une pédagogie adaptée.",
    },
    {
      question: "Puis-je commencer en étant débutant ?",
      answer:
        "Oui. Les cours accueillent les débutants et permettent une progression étape par étape.",
    },
    {
      question: "Proposez-vous des cours privés ?",
      answer:
        "Oui, des cours individuels sont possibles sur demande selon les disponibilités.",
    },
    {
      question: "Où se situe la salle ?",
      answer: "Le club est situé à Gland, en Suisse.",
    },
  ],
  contact: {
    sectionTitle: "Contact",
    description:
      "Réservez un essai, posez vos questions ou demandez un accompagnement personnalisé.",
    phone: "+41 79 000 00 00",
    email: "contact@martialspiritgym.ch",
    address: "Martial Spirit Gym, Gland, Suisse",
    ctaLabel: "Demander un cours d'essai",
    ctaHref: "mailto:contact@martialspiritgym.ch",
  },
  nav: [
    { label: "Accueil", href: "#hero" },
    { label: "Disciplines", href: "#disciplines" },
    { label: "Planning", href: "#planning" },
    { label: "Tarifs", href: "#tarifs" },
    { label: "FAQ", href: "#faq" },
    { label: "Contact", href: "#contact" },
  ],
} as const;
