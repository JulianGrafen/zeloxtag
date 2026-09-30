type DocumentDetailAccess = {
  isOwner: boolean;
  isContributor: boolean;
};

type DocumentForDetailAccess = {
  type: string;
};

/** Owner may correct any stored document; Schrauber only invoices. */
export function canEditVehicleDocumentDetail(
  access: DocumentDetailAccess,
  document: DocumentForDetailAccess,
): boolean {
  if (access.isOwner) return true;
  return access.isContributor && document.type === "invoice";
}
