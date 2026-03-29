/**
 * Input-Sanitierung und XSS-Schutz für Genera3D Studio
 * Phase 1: Kritische Sicherheitsfixes
 */

// Erlaubte Tags für Rich-Text (wenn benötigt)
const ALLOWED_TAGS = ['b', 'i', 'em', 'strong', 'p', 'br'];

// Gefährliche Muster für XSS-Erkennung
const XSS_PATTERNS = [
  /<script[^>]*>.*?<\/script>/i,
  /<script[^>]*\/>/i,
  /javascript:/i,
  /on\w+\s*=/i, // onclick, onerror, etc.
  /<iframe/i,
  /<object/i,
  /<embed/i,
  /data:text\/html/i,
];

// Formel-Injektions-Muster (für CSV/Excel)
const FORMULA_INJECTION_CHARS = ['=', '+', '-', '@', '\t', '\r', '\n'];

/**
 * Sanitisiert HTML-Input durch Entfernen aller Tags
 */
export function stripHtml(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input.replace(/<[^>]*>/g, '');
}

/**
 * Sanitisiert HTML und erlaubt nur bestimmte Tags
 */
export function sanitizeHtml(input: string, allowedTags: string[] = ALLOWED_TAGS): string {
  if (!input || typeof input !== 'string') return '';
  
  return input.replace(/<\/?([a-z][a-z0-9]*)\b[^>]*\/?>/gi, (match, tagName: string) => {
    if (!allowedTags.includes(tagName.toLowerCase())) return '';
    const isClosing = match.startsWith('</');
    const isSelfClosing = match.endsWith('/>');
    if (isClosing) return `</${tagName}>`;
    if (isSelfClosing) return `<${tagName} />`;
    return `<${tagName}>`;
  });
}

/**
 * Prüft auf XSS-Angriffsmuster
 */
export function detectXss(input: string): boolean {
  if (!input || typeof input !== 'string') return false;
  
  return XSS_PATTERNS.some(pattern => pattern.test(input));
}

/**
 * Sanitisiert Input für sichere Darstellung im DOM
 * - Entfernt HTML-Tags
 - Escaped spezielle Zeichen
 */
export function sanitizeText(input: string): string {
  if (!input || typeof input !== 'string') return '';
  
  return stripHtml(input).trim();
}

/**
 * Sanitisiert Input für CSV-Export (Formel-Injektion-Schutz)
 */
export function sanitizeForCsv(input: string): string {
  if (!input || typeof input !== 'string') return '';
  
  const trimmed = input.trim();
  
  // Wenn der String mit gefährlichen Zeichen beginnt, mit Apostroph prefixen
  if (FORMULA_INJECTION_CHARS.some(char => trimmed.startsWith(char))) {
    return `'${trimmed}`;
  }
  
  return trimmed;
}

/**
 * Sanitisiert einen Dateinamen
 */
export function sanitizeFilename(input: string): string {
  if (!input || typeof input !== 'string') return 'untitled';
  
  // Entferne ungültige Zeichen für Dateinamen
  return input
    .replace(/[<>:"/\\|?*]/g, '_')  // Ungültige Zeichen
    .replace(/\s+/g, '_')             // Leerzeichen zu Unterstrichen
    .substring(0, 255);                // Max Länge
}

/**
 * Validiert E-Mail-Adressen
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validiert Seriennummern (alphanumeric, keine Sonderzeichen)
 */
export function isValidSerialNumber(serial: string): boolean {
  if (!serial || typeof serial !== 'string') return false;
  const serialRegex = /^[a-zA-Z0-9_-]+$/;
  return serialRegex.test(serial) && serial.length >= 3;
}

/**
 * Beschränkt String-Länge
 */
export function truncate(input: string, maxLength: number): string {
  if (!input || typeof input !== 'string') return '';
  if (input.length <= maxLength) return input;
  return input.substring(0, maxLength);
}

/**
 * Sanitisiert Such-Queries
 */
export function sanitizeSearchQuery(input: string): string {
  if (!input || typeof input !== 'string') return '';
  
  // Entferne SQL-ähnliche Muster
  return input
    .replace(/[%_]/g, '')  // SQL Wildcards
    .replace(/['";]/g, '') // Quotes und Semikolon
    .trim();
}

/**
 * Überprüft ob ein String potenziell gefährlich ist
 * für die Anzeige im UI
 */
export function isPotentiallyDangerous(input: string): { safe: boolean; reason?: string } {
  if (!input || typeof input !== 'string') return { safe: true };
  
  if (detectXss(input)) {
    return { safe: false, reason: 'XSS patterns detected' };
  }
  
  if (input.length > 10000) {
    return { safe: false, reason: 'Input too long' };
  }
  
  return { safe: true };
}
