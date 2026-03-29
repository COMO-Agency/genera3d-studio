import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Download, CheckCircle2, Info, Tag } from "lucide-react";
import { format } from "date-fns";
import Gs1DataMatrix from "@/components/Gs1DataMatrix";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import React, { useState } from "react";
import { generateLabelPdf } from "@/lib/generateLabelPdf";
import { toast } from "@/hooks/use-toast";

interface UdiLabelPreviewProps {
  open: boolean;
  onClose: () => void;
  data: {
    designName: string;
    udiPi: string;
    fullGs1: string | null;
    mode: string;
    orgName?: string;
    contactPerson?: string;
    orgAddress?: string;
  } | null;
}

const UdiLabelPreview = ({ open, onClose, data }: UdiLabelPreviewProps) => {
  const [now, setNow] = useState(() => new Date());
  
  // Refresh date each time dialog opens
  React.useEffect(() => {
    if (open) setNow(new Date());
  }, [open]);

  if (!data) return null;

  const isSunglasses = data.mode === "sunglasses";
  const _isOpticalSun = data.mode === "optical_sun";
  const _isOptical = data.mode === "optical";

  const handleDownloadPDF = async () => {
    try {
      await generateLabelPdf({
        designName: data.designName,
        mode: data.mode,
        date: now,
        orgName: data.orgName,
        contactPerson: data.contactPerson,
        orgAddress: data.orgAddress,
        udiPi: data.udiPi,
        fullGs1: data.fullGs1,
      });
    } catch {
      toast({ title: "PDF-Erstellung fehlgeschlagen", variant: "destructive" });
    }
  };

  const getModeLabel = () => {
    if (data.mode === "optical") return "Optische Brille";
    if (data.mode === "optical_sun") return "Opt. Sonnenbrille";
    if (isSunglasses) return "Sonnenbrille (PSA)";
    return data.mode;
  };

  const getModeBadgeVariant = () => {
    if (data.mode === "optical") return "default" as const;
    if (isSunglasses) return "outline" as const;
    return "secondary" as const;
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-success">
            <CheckCircle2 className="h-5 w-5" />
            Rahmen erfolgreich angelegt
          </DialogTitle>
          <DialogDescription>
            {isSunglasses ? "Seriennummer" : "GTIN-Label-Vorschau"} für {data.designName}
          </DialogDescription>
        </DialogHeader>

        <div className="border-2 border-dashed border-border rounded-lg p-5 space-y-4 bg-muted/30">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground text-lg">{data.designName}</h3>
            <Badge variant={getModeBadgeVariant()}>
              {getModeLabel()}
            </Badge>
          </div>

          <Separator />

          {/* Firmendaten */}
          {(data.orgName || data.contactPerson) && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              {data.orgName && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Firma</p>
                  <p className="font-medium text-foreground">{data.orgName}</p>
                </div>
              )}
              {data.contactPerson && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Verantw. Person</p>
                  <p className="font-medium text-foreground">{data.contactPerson}</p>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Seriennummer</p>
              <p className="text-sm font-mono font-bold text-foreground">{data.udiPi}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Produktionsdatum</p>
              <p className="text-sm font-medium text-foreground">{format(now, "dd.MM.yyyy HH:mm")}</p>
            </div>
          </div>

          {data.fullGs1 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Full GS1 String</p>
              <div className="text-sm font-mono text-foreground bg-background rounded px-2 py-1.5 break-all border border-border">
                {data.fullGs1.split(/(\(\d{2}\))/).filter(Boolean).map((segment, i) =>
                  segment.match(/^\(\d{2}\)$/)
                    ? <span key={i} className="text-primary font-bold">{segment}</span>
                    : <span key={i}>{segment}</span>
                )}
              </div>
              <Collapsible>
                <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1.5">
                  <Info className="h-3 w-3" /> GS1-Aufschlüsselung
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-1.5 text-xs text-muted-foreground space-y-1 animate-fade-in">
                  <p><span className="text-primary font-mono font-bold">(01)</span> = GTIN (Global Trade Item Number)</p>
                  <p><span className="text-primary font-mono font-bold">(11)</span> = Produktionsdatum</p>
                  <p><span className="text-primary font-mono font-bold">(21)</span> = Seriennummer</p>
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}

          {data.fullGs1 && (
            <div className="flex items-center justify-center py-4">
              <div className="bg-white p-3 rounded-lg">
                <Gs1DataMatrix value={data.fullGs1} size={96} type="qrcode" />
              </div>
            </div>
          )}

          <Separator />
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-primary" />
            <span className="text-sm text-muted-foreground">
              {isSunglasses
                ? "PSA-Seriennummer wird mit der Sonnenbrille übergeben."
                : "GTIN wird als gedrucktes Label mit der Brille übergeben."}
            </span>
          </div>

          <p className="text-xs text-muted-foreground">
            Status: <span className="text-warning font-medium">QC ausstehend</span> — Qualitätskontrolle nach Zusammenbau erforderlich.
          </p>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" className="gap-2" onClick={handleDownloadPDF}>
            <Download className="h-4 w-4" /> PDF herunterladen
          </Button>
          <Button onClick={onClose}>Schließen</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UdiLabelPreview;
