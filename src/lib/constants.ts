/** Production log status → German label */
export const productionStatusLabelMap: Record<string, string> = {
  qc_pending: "QC ausstehend",
  qc_passed: "QC bestanden",
  qc_failed: "QC fehlgeschlagen",
  printed: "Gedruckt",
  failed: "Fehlgeschlagen",
  cancelled: "Storniert",
};

/** Status → CSS class */
export const productionStatusColorMap: Record<string, string> = {
  qc_pending: "bg-warning/10 text-warning border-warning/20",
  qc_passed: "bg-success/10 text-success border-success/20",
  qc_failed: "bg-destructive/10 text-destructive border-destructive/20",
  printed: "bg-success/10 text-success border-success/20",
  failed: "bg-destructive/10 text-destructive border-destructive/20",
  cancelled: "bg-muted text-muted-foreground border-muted",
};

/** Production mode → German label */
export const modeLabelMap: Record<string, string> = {
  optical: "Optische Brille (MDR)",
  optical_sun: "Optische Sonnenbrille (MDR+PSA)",
  sunglasses: "Sonnenbrille (PSA)",
};

/** QC Checklist items */
export const qcChecklistItems = [
  "Rahmen visuell geprüft (keine Druckfehler)",
  "Bügel korrekt montiert",
  "Gläser passgenau eingesetzt",
  "Scharniere funktionsfähig",
  "Gesamteindruck / Finish",
];
