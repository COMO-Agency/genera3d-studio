import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Box, Printer, Weight, Hash, Cuboid, Image, Copy, Check, Info } from "lucide-react";
import { useState, useRef, useEffect, Suspense, lazy } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import DimensionsTable from "@/components/catalog/DimensionsTable";
import ShareDesignButton from "@/components/catalog/ShareDesignButton";
import { Skeleton } from "@/components/ui/skeleton";

const ModelViewer = lazy(() => import("@/components/catalog/ModelViewer"));

interface DesignDetailSheetProps {
  open: boolean;
  onClose: () => void;
  design: {
    id: string;
    name: string;
    version: number | null;
    weight_g: number | null;
    master_udi_di_base: string;
    glb_preview_url: string | null;
    bridge_width_mm?: number | null;
    lens_width_mm?: number | null;
    temple_length_mm?: number | null;
    size?: string | null;
    construction_type?: string | null;
  } | null;
  collectionName?: string;
  materialName?: string;
  onConfigure?: (design: { id: string; name: string; udiDiBase?: string }) => void;
}

const DesignDetailSheet = ({ open, onClose, design, collectionName, materialName = "Digital Acetate", onConfigure }: DesignDetailSheetProps) => {
  const [show3D, setShow3D] = useState(false);
  const [udiCopied, setUdiCopied] = useState(false);

  const copyTimerRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(copyTimerRef.current), []);
  const copyUdi = async () => {
    if (!design) return;
    try {
      await navigator.clipboard.writeText(design.master_udi_di_base);
      setUdiCopied(true);
      clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setUdiCopied(false), 2000);
    } catch { /* non-critical */ }
  };

  if (!design) return null;

  const imageSrc = design.glb_preview_url;
  const has3D = false;

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) { onClose(); setShow3D(false); } }}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-lg">{design.name}</SheetTitle>
          <SheetDescription>{collectionName ?? "Kollektion"}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div className="space-y-2">
            {has3D && (
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant={show3D ? "default" : "outline"} className="gap-1.5 h-7 text-xs" onClick={() => setShow3D(true)}>
                  <Cuboid className="h-3 w-3" /> 3D
                </Button>
                <Button size="sm" variant={!show3D ? "default" : "outline"} className="gap-1.5 h-7 text-xs" onClick={() => setShow3D(false)}>
                  <Image className="h-3 w-3" /> 2D
                </Button>
              </div>
            )}

            {show3D && has3D ? (
              <Suspense fallback={<Skeleton className="aspect-[4/3] rounded-lg" />}>
                <ModelViewer url={design.glb_preview_url!} />
              </Suspense>
            ) : (
              <div className="rounded-lg bg-muted overflow-hidden aspect-[4/3] flex items-center justify-center relative">
                {imageSrc ? (
                  <img src={imageSrc} alt={design.name} className="w-full h-full object-cover" />
                ) : (
                  <Box className="h-16 w-16 text-muted-foreground/30" aria-hidden="true" />
                )}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Version</span>
              <Badge variant="secondary">V{design.version ?? 1}</Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <Weight className="h-3.5 w-3.5" /> Gewicht
              </span>
              <span className="text-sm font-medium text-foreground">
                {design.weight_g != null ? `${design.weight_g}g` : "—"}
              </span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <Hash className="h-3.5 w-3.5" /> UDI-DI Basis
              </span>
              <span className="text-sm font-mono font-medium text-foreground">
                {design.master_udi_di_base}
              </span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <Printer className="h-3.5 w-3.5" /> Material
              </span>
              <span className="text-sm font-medium text-foreground">{materialName}</span>
            </div>

            <DimensionsTable
              bridge_width_mm={design.bridge_width_mm}
              lens_width_mm={design.lens_width_mm}
              temple_length_mm={design.temple_length_mm}
            />

            {/* UDI Identification Section */}
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Hash className="h-4 w-4 text-primary" />
                UDI-Identifikation
              </div>
              <div className="flex items-center justify-between bg-muted/50 rounded-md px-3 py-2">
                <code className="text-sm font-mono font-bold text-foreground">{design.master_udi_di_base}</code>
                <button onClick={copyUdi} className="text-muted-foreground hover:text-foreground transition-colors" aria-label="UDI-DI kopieren">
                  {udiCopied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
              <Collapsible>
                <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <Info className="h-3 w-3" /> Was bedeutet das?
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 text-xs text-muted-foreground space-y-2 animate-fade-in">
                  <p>Bei Produktion wird eine eindeutige <strong className="text-foreground">UDI-PI</strong> (Production Identifier) generiert, die zusammen mit der UDI-DI den vollständigen GS1-konformen UDI-String bildet.</p>
                  <div className="font-mono text-[11px] bg-muted rounded px-2 py-1.5 flex flex-wrap gap-1">
                    <span className="text-primary">(01)</span><span className="text-foreground">[UDI-DI]</span>
                    <span className="text-neon-cyan">+</span>
                    <span className="text-primary">(11)</span><span className="text-foreground">[Datum]</span>
                    <span className="text-neon-cyan">+</span>
                    <span className="text-primary">(21)</span><span className="text-foreground">[UDI-PI]</span>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>

          <div className="flex gap-3">
            {onConfigure ? (
              <Button
                className="flex-1"
                size="lg"
                onClick={() => {
                  onConfigure({ id: design.id, name: design.name, udiDiBase: design.master_udi_di_base });
                  onClose();
                }}
              >
                Konfigurieren & Drucken
              </Button>
            ) : (
              <p className="flex-1 text-sm text-muted-foreground text-center py-2">
                Organisation erforderlich zum Drucken
              </p>
            )}
            <ShareDesignButton designId={design.id} designName={design.name} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default DesignDetailSheet;
