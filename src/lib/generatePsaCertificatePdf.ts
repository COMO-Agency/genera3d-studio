import { format, addYears } from "date-fns";

export interface PsaCertificateData {
  /** Optiker / Hersteller */
  orgName: string;
  address: string;
  city: string;
  contactPerson: string;
  /** Product */
  designName: string;
  serialNumber: string;
  /** Glass data */
  glassType: string;
  filterCategory: string;
  glassManufacturer: string;
  /** Dedicated MDR Art. 15 responsible person (priority over contactPerson) */
  mdrResponsiblePerson?: string;
  /** UID / ATU Number */
  atuNumber?: string;
  /** CEO name */
  ceoName?: string;
  /** SRN */
  srn?: string;
  /** Logo URL */
  logoUrl?: string;
  /** CEO signature URL */
  signatureUrl?: string;
  /** MDR signature URL */
  mdrSignatureUrl?: string;
}

const glassTypeLabels: Record<string, string> = {
  plano: "Plan-Verglasung (Plano)",
  korrektion: "Korrektionsglas",
  polarisiert: "Polarisiert",
  photochrom: "Photochrom",
  sonstige: "Sonstige",
};

async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function loadImageWithDimensions(
  url: string,
): Promise<{ base64: string; width: number; height: number } | null> {
  const base64 = await loadImageAsBase64(url);
  if (!base64) return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () =>
      resolve({ base64, width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = base64;
  });
}

export async function generatePsaCertificatePdf(data: PsaCertificateData) {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const now = new Date();
  const validUntil = addYears(now, 5);
  const pageW = 210;
  const marginL = 25;
  const marginR = 25;
  const contentW = pageW - marginL - marginR;
  let y = 25;

  const line = (yPos: number) => {
    doc.setDrawColor(180);
    doc.line(marginL, yPos, pageW - marginR, yPos);
  };

  const ceoName = data.ceoName || data.contactPerson;
  const mdrPerson = data.mdrResponsiblePerson || ceoName;

  // Logo
  if (data.logoUrl) {
    const logoData = await loadImageWithDimensions(data.logoUrl);
    if (logoData) {
      try {
        const maxH = 15;
        const aspect = logoData.width / logoData.height;
        const imgH = maxH;
        const imgW = imgH * aspect;
        const imgFormat = logoData.base64.includes("image/png")
          ? "PNG"
          : "JPEG";
        doc.addImage(
          logoData.base64,
          imgFormat,
          (pageW - imgW) / 2,
          y - 5,
          imgW,
          imgH,
        );
        y += imgH + 2;
      } catch {
        // skip
      }
    }
  }
  y += 8;

  // Title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("EU-KONFORMITÄTSERKLÄRUNG", pageW / 2, y, { align: "center" });
  y += 6;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(
    "gemäß Verordnung (EU) 2016/425 über Persönliche Schutzausrüstung (PSA)",
    pageW / 2,
    y,
    { align: "center" },
  );
  y += 5;
  doc.text("Sonnenbrille — PSA Kategorie I", pageW / 2, y, { align: "center" });
  y += 10;
  line(y);
  y += 10;

  const sectionTitle = (title: string) => {
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(title, marginL, y);
    y += 7;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
  };

  const field = (label: string, value: string) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, marginL, y);
    doc.setFont("helvetica", "normal");
    const labelW = doc.getTextWidth(`${label}: `);
    doc.text(value || "—", marginL + labelW + 2, y);
    y += 6;
  };

  // 1. Hersteller (= Optiker)
  sectionTitle("1. Hersteller der Sonnenbrille");
  field("Name / Firma", data.orgName);
  field("Anschrift", data.address);
  field("Ort", data.city);
  if (data.atuNumber) field("UID-Nummer", data.atuNumber);
  if (data.srn) field("SRN", data.srn);
  field("Verantwortliche Person", mdrPerson);
  y += 2;
  doc.setFontSize(9);
  doc.text(
    "Hinweis: Der Augenoptiker gilt als Hersteller, da er durch das Einschleifen der Gläser",
    marginL,
    y,
    { maxWidth: contentW },
  );
  y += 4;
  doc.text(
    'das fertige Produkt "Sonnenbrille" mit Schutzfunktion erzeugt.',
    marginL,
    y,
  );
  doc.setFontSize(10);
  y += 8;
  line(y);
  y += 8;

  // 2. Produkt
  sectionTitle("2. Produktidentifikation");
  field("Rahmen / Design", data.designName);
  field("Seriennummer", data.serialNumber);
  field("Glastyp", glassTypeLabels[data.glassType] ?? data.glassType);
  field("Filterkategorie", `Kategorie ${data.filterCategory}`);
  field("Glashersteller", data.glassManufacturer);
  field("PSA-Kategorie", "Kategorie I (Schutz gegen Sonnenlicht)");
  y += 4;
  line(y);
  y += 8;

  // 3. Konformität
  sectionTitle("3. Erklärung der Konformität");
  doc.text(
    "Der oben bezeichnete Hersteller erklärt hiermit, dass die beschriebene Sonnenbrille den",
    marginL,
    y,
    { maxWidth: contentW },
  );
  y += 5;
  doc.text(
    "Anforderungen folgender Vorschriften und Normen entspricht:",
    marginL,
    y,
  );
  y += 8;

  const norms = [
    "• Verordnung (EU) 2016/425 über Persönliche Schutzausrüstung (PSA-Verordnung)",
    "• EN ISO 12312-1:2013+A1:2015 — Sonnenbrillen und ähnliche Augenschutzgeräte",
    "• UV-Schutz gemäß EN ISO 12312-1 (UV 400)",
  ];
  norms.forEach((n) => {
    doc.text(n, marginL + 4, y, { maxWidth: contentW - 4 });
    y += 6;
  });
  y += 4;
  line(y);
  y += 8;

  // 4. CE
  sectionTitle("4. CE-Kennzeichnung");
  doc.text(
    "Die CE-Kennzeichnung wurde gemäß PSA-Verordnung (EU) 2016/425, Artikel 17 angebracht.",
    marginL,
    y,
    { maxWidth: contentW },
  );
  y += 6;
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("CE", marginL, y + 8);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  y += 16;
  line(y);
  y += 8;

  // 5. Gültigkeit
  sectionTitle("5. Gültigkeit");
  field("Ausgestellt am", format(now, "dd.MM.yyyy"));
  field("Gültig bis", format(validUntil, "dd.MM.yyyy"));
  y += 6;

  // Signature area
  line(y);
  y += 10;
  doc.text(`${data.city || "—"},`, marginL, y);
  doc.text(format(now, "dd.MM.yyyy"), marginL + 60, y);
  y += 8;

  // Signature columns
  const sigCol1 = marginL;
  const sigCol2 = marginL + 80;

  doc.text(ceoName || "—", sigCol1, y);
  doc.text(mdrPerson || "—", sigCol2, y);
  y += 5;
  doc.setFontSize(8);
  doc.text("CEO", sigCol1, y);
  doc.text("Verantwortliche Person", sigCol2, y);
  y += 3;

  // Signature images
  const mdrSigUrl = data.mdrSignatureUrl || data.signatureUrl;
  if (data.signatureUrl) {
    const sigBase64 = await loadImageAsBase64(data.signatureUrl);
    if (sigBase64) {
      try {
        const imgFormat = sigBase64.includes("image/png") ? "PNG" : "JPEG";
        doc.addImage(sigBase64, imgFormat, sigCol1, y, 35, 15);
      } catch {
        // skip
      }
    }
  }
  if (mdrSigUrl) {
    const mdrSigBase64 = await loadImageAsBase64(mdrSigUrl);
    if (mdrSigBase64) {
      try {
        const imgFormat = mdrSigBase64.includes("image/png") ? "PNG" : "JPEG";
        doc.addImage(mdrSigBase64, imgFormat, sigCol2, y, 35, 15);
      } catch {
        // skip
      }
    }
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(140);
  doc.text(
    `Dokument generiert am ${format(now, "dd.MM.yyyy HH:mm")} — ${data.orgName}`,
    pageW / 2,
    287,
    { align: "center" },
  );

  doc.save(`PSA-CE-Erklaerung-${data.serialNumber}.pdf`);
}
