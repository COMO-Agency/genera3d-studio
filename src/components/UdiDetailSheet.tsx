import { format } from "date-fns";
import { Copy, Check, ShieldCheck, Info, Printer, Download, Play, FileCheck, ImageDown } from "lucide-react";
import { useState, useCallback, useRef, useEffect } from "react";
import { generateLabelPdf } from "@/lib/generateLabelPdf";
import Gs1DataMatrix from "@/components/Gs1DataMatrix";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { modeLabelMap } from "@/lib/constants";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Tooltip, TooltipContent, TooltipTrigger, // eslint-disable-line @typescript-eslint/no-unused-vars
} from "@/components/ui/tooltip";
import ProductionModal, { type ProductionSuccessResult } from "@/components/ProductionModal";
import UdiPrintPreview from "@/components/UdiPrintPreview";
import UdiLabelPreview from "@/components/UdiLabelPreview";
import SunglassesGlassDataDialog from "@/components/SunglassesGlassDataDialog";
import CertificateDialog from "@/components/CertificateDialog";
import { useOrgDesigns } from "@/hooks/useOrgDesigns";
import { useProfile } from "@/hooks/useProfile";

interface UdiDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  log: {
    id: string;
    assigned_udi_pi: string | null;
    full_udi_string: string | null;
    assigned_gtin: string | null;
    mode: string | null;
    color: string | null;
    customer_ref: string | null;
    created_at: string | null;
    design_id: string | null;
    design_name: string | null;
    design_udi_di_base: string | null;
    design_version: number | null;
    color_name: string | null;
  } | null;
}

const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timerRef.current), []);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 2000);
      toast({ title: "Kopiert", description: text });
    } catch {
      toast({ title: "Fehler", description: "Kopieren fehlgeschlagen.", variant: "destructive" });
    }
  };
  return (
    <button onClick={copy} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-muted">
      {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
};

const UdiDetailSheet = ({ open, onOpenChange, log }: UdiDetailSheetProps) => {
  const { data: profile } = useProfile();
  const canProduce = !!profile?.org_id;
  const [showProductionModal, setShowProductionModal] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showCertificate, setShowCertificate] = useState(false);
  const [labelData, setLabelData] = useState<ProductionSuccessResult | null>(null);
  const [sunglassesLogId, setSunglassesLogId] = useState<string | null>(null);
  const [reprintDesign, setReprintDesign] = useState<{
    designId: string; designName: string; color?: string; udiDiBase?: string;
  } | null>(null);
  const { data: orgDesigns } = useOrgDesigns();

  const isOrgDesign = !!(log?.design_id && orgDesigns?.some((d) => d.id === log.design_id));

  useEffect(() => {
    if (!open) {
      setShowPrintPreview(false);
      setShowCertificate(false);
    }
  }, [open]);

  const handleDownloadQr = useCallback(() => {
    const canvas = document.querySelector<HTMLCanvasElement>("#udi-detail-qr canvas");
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `QR-${log?.assigned_udi_pi ?? "code"}.png`;
    a.click();
    toast({ title: "QR-Code heruntergeladen" });
  }, [log]);

  const handleStartReprint = useCallback(() => {
    if (!log?.design_id) return;
    setReprintDesign({
      designId: log.design_id,
      designName: log.design_name ?? "Unbekannt",
      color: log.color ?? undefined,
      udiDiBase: log.design_udi_di_base ?? undefined,
    });
    onOpenChange(false);
    setShowProductionModal(true);
  }, [log, onOpenChange]);

  if (!log) return (
    <>
      {reprintDesign && (
        <ProductionModal
          open={showProductionModal}
          onClose={() => { setShowProductionModal(false); setReprintDesign(null); }}
          designId={reprintDesign.designId}
          designName={reprintDesign.designName}
          preselectedColor={reprintDesign.color}
          udiDiBase={reprintDesign.udiDiBase}
          onSuccess={(result) => {
            setLabelData(result);
            if (result.mode === "sunglasses" || result.mode === "optical_sun") {
              setSunglassesLogId(result.logId);
            }
          }}
        />
      )}
      <UdiLabelPreview
        open={!!labelData}
        onClose={() => setLabelData(null)}
        data={labelData ? {
          designName: labelData.designName, udiPi: labelData.udiPi,
          fullGs1: labelData.fullGs1, mode: labelData.mode,
          orgName: labelData.orgName, contactPerson: labelData.contactPerson,
          orgAddress: labelData.orgAddress,
        } : null}
      />
      {sunglassesLogId && (
        <SunglassesGlassDataDialog
          open={!!sunglassesLogId}
          onClose={() => setSunglassesLogId(null)}
          productionLogId={sunglassesLogId}
        />
      )}
    </>
  );

  const gs1 = log.full_udi_string ?? "";
  const match = gs1.match(/^\(01\)(.+?)\(11\)(.+?)\(21\)(.+)$/);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              GTIN-Detail
            </SheetTitle>
            <SheetDescription>{log.design_name ?? "Unbekanntes Design"} — V{log.design_version ?? "?"}</SheetDescription>
          </SheetHeader>

          <div className="space-y-5 mt-4">
            {/* Design & Mode */}
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground text-lg">{log.design_name}</h3>
              <Badge variant={log.mode === "optical" ? "default" : "secondary"}>
                {modeLabelMap[log.mode ?? ""] ?? log.mode}
              </Badge>
            </div>

            <Separator />

            {/* UDI-PI */}
            <div>
              <p className="text-xs text-muted-foreground mb-1">Seriennummer</p>
              <div className="flex items-center gap-2">
                <code className="text-sm font-mono font-bold text-primary bg-primary/10 px-2 py-1 rounded border border-primary/20">
                  {log.assigned_udi_pi ?? "—"}
                </code>
                {log.assigned_udi_pi && <CopyButton text={log.assigned_udi_pi} />}
              </div>
            </div>

            {/* GTIN */}
            <div>
              <p className="text-xs text-muted-foreground mb-1">GTIN (Global Trade Item Number)</p>
              <div className="flex items-center gap-2">
                <code className="text-sm font-mono text-foreground bg-muted px-2 py-1 rounded border border-border">
                  {log.assigned_gtin ?? "—"}
                </code>
                {log.assigned_gtin && <CopyButton text={log.assigned_gtin} />}
              </div>
            </div>

            {/* UDI-DI Basis */}
            {log.design_udi_di_base && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">UDI-DI Basis</p>
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono text-muted-foreground bg-muted px-2 py-1 rounded border border-border">
                    {log.design_udi_di_base}
                  </code>
                  <CopyButton text={log.design_udi_di_base} />
                </div>
              </div>
            )}

            <Separator />

            {/* QR Code with AI Breakdown side-by-side */}
            {gs1 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">GS1-QR-Code mit Aufschlüsselung</p>
                <div className="flex items-start gap-4 bg-white rounded-lg p-4 shadow-sm border border-border">
                  <div id="udi-detail-qr" className="shrink-0">
                    <Gs1DataMatrix value={gs1} size={100} type="qrcode" />
                  </div>
                  <div className="font-mono text-sm space-y-1 pt-1">
                    {match ? (
                      <>
                        <p><span className="text-primary font-bold">(01)</span><span className="text-primary">{match[1]}</span></p>
                        <p><span className="text-warning font-bold">(11)</span><span className="text-warning">{match[2]}</span></p>
                        <p><span className="text-success font-bold">(21)</span><span className="text-success">{match[3]}</span></p>
                      </>
                    ) : (
                      <p className="text-muted-foreground text-xs break-all">{gs1}</p>
                    )}
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="mt-2 gap-1.5 text-xs" onClick={handleDownloadQr}>
                  <ImageDown className="h-3.5 w-3.5" /> QR-Code als PNG herunterladen
                </Button>
              </div>
            )}

            <Separator />

            {/* GS1 Breakdown Legend */}
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-foreground mb-2">
                <Info className="h-3.5 w-3.5 text-primary" /> GS1-Aufschlüsselung
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-primary" />
                <span className="font-mono font-bold text-primary">(01)</span> = GTIN (Global Trade Item Number)
              </p>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-warning" />
                <span className="font-mono font-bold text-warning">(11)</span> = Produktionsdatum (JJMMTT)
              </p>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-success" />
                <span className="font-mono font-bold text-success">(21)</span> = Seriennummer
              </p>
            </div>

            {/* Label Hinweis */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Printer className="h-4 w-4 text-primary" />
                <h4 className="text-sm font-semibold text-foreground">Physische Kennzeichnung</h4>
                <Badge variant="outline" className="text-[10px] border-success/30 text-success">Label</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Die GTIN wird als gedrucktes Label mit der Brille übergeben und ist darüber rückverfolgbar.
              </p>
            </div>

            <Separator />

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Farbe</p>
                <p className="font-medium text-foreground">{log.color_name ?? log.color ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Vergabedatum</p>
                <p className="font-medium text-foreground">
                  {log.created_at ? format(new Date(log.created_at), "dd.MM.yyyy HH:mm") : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Kundenreferenz</p>
                <p className="font-medium text-foreground">{log.customer_ref || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Design-Version</p>
                <p className="font-medium text-foreground">V{log.design_version ?? "—"}</p>
              </div>
            </div>

            <Separator />

            {/* Action Buttons */}
            <div className="flex flex-col gap-2">
              <Button variant="outline" className="gap-2 justify-start" onClick={() => setShowPrintPreview(true)}>
                <Printer className="h-4 w-4" /> Label drucken
              </Button>
              <Button variant="outline" className="gap-2 justify-start" onClick={async () => {
                try {
                  await generateLabelPdf({
                    designName: log.design_name ?? "Unbekannt",
                    mode: log.mode ?? "",
                    date: log.created_at ?? new Date(),
                    udiPi: log.assigned_udi_pi ?? "unknown",
                    fullGs1: gs1 || null,
                    assignedGtin: log.assigned_gtin,
                  });
                } catch {
                  toast({ title: "PDF-Erstellung fehlgeschlagen", variant: "destructive" });
                }
              }}>
                <Download className="h-4 w-4" /> Label als PDF
              </Button>
              {log.design_id && canProduce && (
                <Button variant="default" className="gap-2 justify-start" onClick={handleStartReprint}>
                  <Play className="h-4 w-4" /> Neuen Druck starten
                </Button>
              )}
              {isOrgDesign && (
                <Button variant="outline" className="gap-2 justify-start" onClick={() => setShowCertificate(true)}>
                  <FileCheck className="h-4 w-4" /> EU-Konformitätserklärung
                </Button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {(reprintDesign ?? log.design_id) && (
        <ProductionModal
          open={showProductionModal}
          onClose={() => { setShowProductionModal(false); setReprintDesign(null); }}
          designId={reprintDesign?.designId ?? log.design_id ?? ""}
          designName={reprintDesign?.designName ?? log.design_name ?? "Unbekannt"}
          preselectedColor={reprintDesign?.color ?? log.color ?? undefined}
          udiDiBase={reprintDesign?.udiDiBase ?? log.design_udi_di_base ?? undefined}
          onSuccess={(result) => {
            setLabelData(result);
            if (result.mode === "sunglasses" || result.mode === "optical_sun") {
              setSunglassesLogId(result.logId);
            }
          }}
        />
      )}

      <UdiPrintPreview open={showPrintPreview} onClose={() => setShowPrintPreview(false)} log={log} />

      {/* Follow-up dialogs — survive ProductionModal unmount */}
      <UdiLabelPreview
        open={!!labelData}
        onClose={() => setLabelData(null)}
        data={labelData ? {
          designName: labelData.designName,
          udiPi: labelData.udiPi,
          fullGs1: labelData.fullGs1,
          mode: labelData.mode,
          orgName: labelData.orgName,
          contactPerson: labelData.contactPerson,
          orgAddress: labelData.orgAddress,
        } : null}
      />

      {sunglassesLogId && (
        <SunglassesGlassDataDialog
          open={!!sunglassesLogId}
          onClose={() => setSunglassesLogId(null)}
          productionLogId={sunglassesLogId}
        />
      )}

      {log.design_name && (
        <CertificateDialog
          open={showCertificate}
          onOpenChange={setShowCertificate}
          design={{
            id: log.design_id ?? "",
            name: log.design_name,
            master_udi_di_base: log.design_udi_di_base ?? "",
            version: log.design_version ?? null,
          }}
          defaultColor={log.color_name ?? undefined}
        />
      )}
    </>
  );
};

export default UdiDetailSheet;
