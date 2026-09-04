import type { Metadata } from "next";
import PublicDocumentsAdminApp from "@/components/admin/public-documents/PublicDocumentsAdminApp";

export const metadata: Metadata = {
  title: "Documents publics — Administration",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminDocumentsPage() {
  return <PublicDocumentsAdminApp />;
}
