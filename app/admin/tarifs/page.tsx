import type { Metadata } from "next";
import PublicTariffsAdminApp from "@/components/admin/tarifs/PublicTariffsAdminApp";

export const metadata: Metadata = {
  title: "Tarifs publics — Administration",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminTarifsPage() {
  return <PublicTariffsAdminApp />;
}
