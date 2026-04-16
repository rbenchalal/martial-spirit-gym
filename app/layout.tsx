import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Martial Spirit Gym | Boxe Thaïlandaise & MMA à Gland pour Kids et Adultes",
  description:
    "Martial Spirit Gym à Gland, école d'arts martiaux en boxe thaïlandaise (Muay Thaï) et MMA pour enfants dès 8 ans, adultes, débutants et confirmés.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/images/logo-martial-spirit-gym.jpeg", type: "image/jpeg" },
    ],
    apple: [{ url: "/images/logo-martial-spirit-gym.jpeg", type: "image/jpeg" }],
  },
  openGraph: {
    title: "Martial Spirit Gym | Boxe Thaïlandaise & MMA à Gland pour Kids et Adultes",
    description:
      "Martial Spirit Gym à Gland, école d'arts martiaux en boxe thaïlandaise (Muay Thaï) et MMA pour enfants dès 8 ans, adultes, débutants et confirmés.",
    siteName: "Martial Spirit Gym",
    locale: "fr_CH",
    type: "website",
    images: ["/opengraph-image"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Martial Spirit Gym | Boxe Thaïlandaise & MMA à Gland pour Kids et Adultes",
    description:
      "Martial Spirit Gym à Gland, école d'arts martiaux en boxe thaïlandaise (Muay Thaï) et MMA pour enfants dès 8 ans, adultes, débutants et confirmés.",
    images: ["/opengraph-image"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const localBusinessJsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsActivityLocation",
    name: "Martial Spirit Gym",
    url: "https://www.martialspiritgym.ch",
    description: "Club d'arts martiaux proposant boxe thaï, MMA et boxe anglaise",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Gland",
      addressRegion: "VD",
      addressCountry: "CH",
    },
    areaServed: ["Gland", "Nyon", "Vich", "La Côte"],
  } as const;

  return (
    <html lang="fr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }}
        />
      </body>
    </html>
  );
}
