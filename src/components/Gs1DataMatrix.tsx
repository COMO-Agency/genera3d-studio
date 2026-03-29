import { useEffect, useRef } from "react";
import bwipjs from "bwip-js";

interface Gs1BarcodeProps {
  value: string;
  size?: number;
  className?: string;
  id?: string;
  /** Barcode type: "datamatrix" (default) or "qrcode" */
  type?: "datamatrix" | "qrcode";
}

/**
 * Convert a raw GS1 string (with ASCII 29 GS separators) to
 * AI-parenthesised format expected by bwip-js with parsefnc.
 *
 * Input:  (01)0481…(21)SN…\x1D91KEY\x1D92CODE
 * Output: (01)0481…(21)SN…(91)KEY(92)CODE
 *
 * If already parenthesised throughout, returns as-is.
 */
export function toParenthesisedGs1(raw: string): string {
  // If the string already starts with "(" it's likely formatted
  if (raw.startsWith("(")) return raw;

  // Known 2-digit AIs used in UDI strings
  // eslint-disable-next-line no-control-regex
  const aiPattern = /\x1D(\d{2})/g;
  let result = raw.replace(aiPattern, "($1)");

  // Wrap leading AI if present (e.g. "01…" → "(01)…")
  const leadingAi = result.match(/^(\d{2})/);
  if (leadingAi) {
    result = `(${leadingAi[1]})` + result.slice(2);
  }

  return result;
}

const Gs1Barcode = ({ value, size = 128, className, id, type = "datamatrix" }: Gs1BarcodeProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !value) return;

    try {
      const gs1Text = toParenthesisedGs1(value);
      const bcid = type === "qrcode" ? "gs1qrcode" : "datamatrix";

      bwipjs.toCanvas(canvas, {
        bcid,
        text: gs1Text,
        scale: 3,
        parsefnc: true,
        backgroundcolor: "FFFFFF",
      });
    } catch (err) {
      console.error("GS1 barcode rendering failed:", err);
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [value, type]);

  return (
    <canvas
      ref={canvasRef}
      id={id}
      className={className}
      style={{ width: size, height: size, imageRendering: "pixelated" }}
    />
  );
};

export default Gs1Barcode;
