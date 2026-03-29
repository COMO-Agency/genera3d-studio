import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Safe clipboard write that swallows errors on insecure contexts. */
export async function safeClipboardWrite(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Extract a human-readable message from an unknown catch value. */
export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Unbekannter Fehler";
}

const MAX_UPLOAD_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
];

/** Validates a file before upload (size + MIME type). Throws on invalid. */
export function validateImageFile(file: File): void {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error(
      `Ungültiger Dateityp: ${file.type || "unbekannt"}. Erlaubt: JPEG, PNG, WebP, GIF, SVG.`,
    );
  }
  if (file.size > MAX_UPLOAD_SIZE) {
    throw new Error(
      `Datei zu groß (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum: 10 MB.`,
    );
  }
}
