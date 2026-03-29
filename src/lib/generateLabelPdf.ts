import { toParenthesisedGs1 } from "@/components/Gs1DataMatrix";
import { format } from "date-fns";

export interface LabelPdfData {
  designName: string;
  mode: string;
  date: Date | string;
  orgName?: string;
  contactPerson?: string;
  orgAddress?: string;
  udiPi: string;
  fullGs1: string | null;
  assignedGtin?: string | null;
}

/**
 * Generates a consistent GTIN label PDF used by both
 * UdiLabelPreview (after production) and UdiDetailSheet (production register).
 */
export async function generateLabelPdf(data: LabelPdfData): Promise<void> {
  const [{ default: jsPDF }, { default: bwipjs }] = await Promise.all([
    import("jspdf"),
    import("bwip-js"),
  ]);
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: [105, 148],
  });
  doc.setTextColor(0, 0, 0);

  const raw = typeof data.date === "string" ? new Date(data.date) : data.date;
  const dateObj = isNaN(raw.getTime()) ? new Date() : raw;

  // Title
  doc.setFontSize(14);
  doc.text(data.designName, 10, 15);
  doc.setFontSize(10);
  const modeText =
    data.mode === "optical"
      ? "Optische Brille — MDR"
      : data.mode === "optical_sun"
        ? "Optische Sonnenbrille — MDR+PSA"
        : data.mode === "sunglasses"
          ? "Sonnenbrille — PSA"
          : data.mode;
  doc.text(modeText, 10, 22);

  doc.setFontSize(9);
  doc.text(`Datum: ${format(dateObj, "dd.MM.yyyy HH:mm")}`, 10, 30);

  // Company data
  let nextY = 36;
  if (data.orgName || data.contactPerson) {
    if (data.orgName) {
      doc.text(`Firma: ${data.orgName}`, 10, nextY);
      nextY += 5;
    }
    if (data.contactPerson) {
      doc.text(`Verantw. Person: ${data.contactPerson}`, 10, nextY);
      nextY += 5;
    }
    if (data.orgAddress) {
      doc.text(`Adresse: ${data.orgAddress}`, 10, nextY);
      nextY += 5;
    }
  }

  // QR-Code left + GS1 fields right
  const qrY = Math.max(nextY + 4, 50);
  if (data.fullGs1) {
    let qrRendered = false;
    try {
      const gs1Text = toParenthesisedGs1(data.fullGs1);
      if (gs1Text && gs1Text.length >= 4) {
        const canvas = document.createElement("canvas");
        bwipjs.toCanvas(canvas, {
          bcid: "gs1qrcode",
          text: gs1Text,
          scale: 4,
          parsefnc: true,
          backgroundcolor: "FFFFFF",
        });
        if (canvas.width > 10 && canvas.height > 10) {
          const imgData = canvas.toDataURL("image/png");
          doc.addImage(imgData, "PNG", 10, qrY, 35, 35);
          qrRendered = true;
        }
      }
    } catch (err) {
      console.error("QR-Code PDF embed failed:", err);
    }

    // GS1 fields next to QR code
    const fieldX = qrRendered ? 50 : 10;
    doc.setFontSize(9);
    const aiRegex = /\((\d{2})\)([^(]*)/g;
    let match;
    let fieldY = qrY + 5;
    while ((match = aiRegex.exec(data.fullGs1)) !== null) {
      doc.text(`(${match[1]}) ${match[2].trim()}`, fieldX, fieldY);
      fieldY += 6;
    }
    if (fieldY === qrY + 5) {
      doc.text(data.fullGs1, fieldX, fieldY, { maxWidth: 90 });
    }
  }

  doc.setFontSize(8);
  doc.text("GTIN wird als gedrucktes Label mit der Brille übergeben.", 10, 95);
  doc.save(`GTIN-Label-${data.udiPi}.pdf`);
}
