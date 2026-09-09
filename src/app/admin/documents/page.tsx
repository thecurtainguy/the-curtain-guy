import type { Metadata } from "next";
import { ScrollText } from "lucide-react";
import { requireAdminPage } from "@/lib/admin-page";
import { AdminPageFrame } from "@/components/admin/admin-page-frame";
import {
  AdminDocumentTextsEditor,
  type AdminDocumentTextItem,
} from "@/components/admin/admin-document-texts";
import { PortalPageHeader } from "@/components/portal/portal-page-header";
import { DOCUMENT_TEXT_DEFS } from "@/data/document-texts";
import { listDocumentTexts } from "@/lib/document-texts";

export const metadata: Metadata = {
  title: "Document texts",
  robots: { index: false, follow: false },
};

export default async function AdminDocumentsPage() {
  const owner = await requireAdminPage();
  const rows = await listDocumentTexts();
  const initialTexts: AdminDocumentTextItem[] = DOCUMENT_TEXT_DEFS.map(
    (def) => {
      const row = rows.find((item) => item.slug === def.slug);
      return {
        ...def,
        body: row?.body ?? def.defaultBody,
        updated_at: row?.updated_at ?? null,
        isCustomized: row?.isCustomized ?? false,
      };
    }
  );

  return (
    <AdminPageFrame email={owner.profile.email} profile={owner.profile}>
      <div className="space-y-6">
        <PortalPageHeader
          eyebrow="Documents"
          title="Terms & document copy"
          description="Set the terms, disclaimers, and footer text used on quotes, PDFs, and emails the system generates."
          icon={ScrollText}
        />
        <AdminDocumentTextsEditor initialTexts={initialTexts} />
      </div>
    </AdminPageFrame>
  );
}
