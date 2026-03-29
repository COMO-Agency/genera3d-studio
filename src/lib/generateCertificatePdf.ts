import { format, addYears } from "date-fns";

export interface CertificateData {
  orgName: string;
  address: string;
  atuNumber: string;
  contactPerson: string;
  city: string;
  designName: string;
  version: number;
  masterUdiDiBase: string;
  /** Design model name (e.g. "ME01 S") */
  modelName?: string;
  /** Color of the produced frame */
  color?: string;
  /** Construction type determines certificate variant */
  constructionType?: "full_frame" | "combo_frame";
  /** Dedicated MDR Art. 15 responsible person */
  mdrResponsiblePerson?: string;
  /** CEO / Geschäftsführer name (separate from MDR person) */
  ceoName?: string;
  /** Single Registration Number */
  srn?: string;
  /** Signature image URL (PNG/JPEG) */
  signatureUrl?: string;
  /** MDR responsible person signature image URL (separate from CEO) */
  mdrSignatureUrl?: string;
  /** Organization logo URL (PNG/JPEG) */
  logoUrl?: string;
  /** Custom certificate date (defaults to now) */
  certificateDate?: Date;
}

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

/** Load image and return base64 + natural dimensions */
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

export async function generateCertificatePdf(data: CertificateData) {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const certDate = data.certificateDate ?? new Date();
  const validUntil = addYears(certDate, 5);
  const pageW = 210;
  const marginL = 25;
  const marginR = 25;
  const contentW = pageW - marginL - marginR;
  let y = 25;

  const line = (yPos: number) => {
    doc.setDrawColor(180);
    doc.line(marginL, yPos, pageW - marginR, yPos);
  };

  // Resolve manufacturer data — always use org data
  const mfgName = data.orgName;
  const mfgAddress = data.address;
  const mfgCity = data.city;
  const ceoName = data.ceoName || data.contactPerson;
  const mdrPerson = data.mdrResponsiblePerson || ceoName;

  // Determine UDI-DI based on construction type
  const _isCombo = data.constructionType === "combo_frame";
  const udiDi = data.masterUdiDiBase || "—";

  // Logo centered above title
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
  y += 12;

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  doc.text("EU-KONFORMITÄTSERKLÄRUNG", pageW / 2, y, { align: "center" });
  y += 10;
  line(y);
  y += 10;

  // Manufacturer block
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Name des Herstellers:", marginL, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.text(mfgName, marginL, y);
  y += 5;
  if (mfgAddress) {
    doc.text(mfgAddress, marginL, y);
    y += 5;
  }
  if (mfgCity) {
    doc.text(mfgCity, marginL, y);
    y += 5;
  }
  if (data.atuNumber) {
    doc.text(`UID: ${data.atuNumber}`, marginL, y);
    y += 5;
  }
  y += 4;

  // Product data table
  const tableData: [string, string][] = [
    ["Single Registration Number (SRN):", data.srn || "—"],
    [
      "Produktname:",
      data.designName
        ? `Korrektionsfassung — ${data.designName}`
        : "Korrektionsfassung",
    ],
    ["Modell:", data.modelName || data.designName || "—"],
    ["Farbe:", data.color || "—"],
    ["Basic UDI-DI:", udiDi],
    [
      "Nomenklatur:",
      "UMDNS Code (ECRI) 11-667, GMDN Code 32816, EMDN Code Q021002",
    ],
    ["Risikoklasse:", "Klasse I – nicht steril, keine Messfunktion"],
  ];

  const labelW = 65;
  tableData.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.text(label, marginL, y);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(value, contentW - labelW);
    doc.text(lines, marginL + labelW, y);
    y += Math.max(lines.length, 1) * 5 + 1;
  });

  y += 4;
  line(y);
  y += 8;

  // Conformity assessment
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Konformitätsbewertungsverfahren gemäß Artikel 52 (7)", marginL, y, {
    maxWidth: contentW,
  });
  y += 5;
  doc.text("für Medizinprodukte", marginL, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(
    "Wir erklären in alleiniger Verantwortung, dass das Produkt den Bestimmungen der nachfolgenden Rechtsvorschriften entspricht:",
    marginL,
    y,
    { maxWidth: contentW },
  );
  y += 12;

  const norms = [
    "• Verordnung (EU) 2017/745 des Europäischen Parlaments und des Rates über Medizinprodukte",
    "• Verordnung (EG) Nr. 1907/2006 zur Registrierung, Bewertung, Zulassung und Beschränkung chemischer Stoffe (REACH)",
    "• Entspricht der Europäischen Norm EN ISO 12870",
  ];
  norms.forEach((n) => {
    const lines = doc.splitTextToSize(n, contentW - 4);
    doc.text(lines, marginL + 4, y);
    y += lines.length * 5 + 2;
  });

  y += 4;

  // PMS
  doc.text(
    "Wir unterhalten ein systematisches Verfahren zur Überwachung des Produktes nach dem Inverkehrbringen.",
    marginL,
    y,
    { maxWidth: contentW },
  );
  y += 10;

  // Validity
  doc.setFont("helvetica", "bold");
  doc.text(
    "Diese Konformitätserklärung hat eine Gültigkeit von 5 Jahren.",
    marginL,
    y,
  );
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.text(
    `Ausgestellt am: ${format(certDate, "dd.MM.yyyy")}  —  Gültig bis: ${format(validUntil, "dd.MM.yyyy")}`,
    marginL,
    y,
  );
  y += 10;
  line(y);
  y += 10;

  // Signature area
  doc.setFont("helvetica", "normal");
  doc.text(`${mfgCity || "—"},`, marginL, y);
  y += 6;

  const _dateRow = y;
  doc.setFont("helvetica", "bold");
  doc.text("Ort und Datum", marginL, y);
  doc.text(format(certDate, "dd.MM.yyyy"), marginL + 40, y);
  y += 8;

  // Signature columns
  const sigCol1 = marginL;
  const sigCol2 = marginL + 80;

  doc.setFont("helvetica", "normal");
  doc.text(ceoName || "—", sigCol1, y);
  doc.text(mdrPerson || "—", sigCol2, y);
  y += 5;
  doc.setFontSize(8);
  doc.text("CEO", sigCol1, y);
  doc.text("Verantwortliche Person (Art. 15 MDR)", sigCol2, y);
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
        // Silently skip if image fails
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
        // Silently skip if image fails
      }
    }
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(140);
  doc.text(
    `Dokument generiert am ${format(new Date(), "dd.MM.yyyy HH:mm")} — ${data.orgName}`,
    pageW / 2,
    287,
    { align: "center" },
  );

  const fileName = `EU-Konformitaetserklaerung-${data.designName}-V${data.version}.pdf`;
  doc.save(fileName);
}
