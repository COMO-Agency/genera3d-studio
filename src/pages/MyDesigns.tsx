import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Glasses, Trash2, Ruler, Weight, Barcode, Tag, Layers, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import EmptyState from "@/components/EmptyState";
import OrgDesignForm from "@/components/designs/OrgDesignForm";
import ProductionModal, { type ProductionSuccessResult } from "@/components/ProductionModal";
import UdiLabelPreview from "@/components/UdiLabelPreview";
import SunglassesGlassDataDialog from "@/components/SunglassesGlassDataDialog";
import { useOrgDesigns, useDeleteOrgDesign, type OrgDesign } from "@/hooks/useOrgDesigns";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useAdminScopes } from "@/hooks/useAdminScopes";
import LabelAdminDesigns from "@/pages/LabelAdminDesigns";

const OrgDesignCard = ({ design, onDelete, onEdit, onProduce }: { design: OrgDesign; onDelete: (id: string) => void; onEdit: (d: OrgDesign) => void; onProduce: (d: OrgDesign) => void }) => (
  <Card className="group relative animate-fade-in overflow-hidden">
    {design.image_url && (
      <div className="h-36 w-full bg-muted overflow-hidden">
        <img src={design.image_url} alt={design.name} className="h-full w-full object-contain" />
      </div>
    )}
    <CardHeader className="pb-2">
      <div className="flex items-center justify-between gap-2">
        <CardTitle className="text-base truncate">{design.name}</CardTitle>
        <div className="flex items-center gap-1 shrink-0">
          {design.size && <Badge variant="secondary" className="text-[10px]">{design.size}</Badge>}
          {design.construction_type === "combo_frame" && <Badge variant="outline" className="text-[10px]">Combo</Badge>}
          {design.master_udi_di_base && <Badge variant="outline" className="text-xs">UDI</Badge>}
        </div>
      </div>
    </CardHeader>
    <CardContent className="space-y-1.5 text-sm text-muted-foreground">
      {design.collection && (
        <p className="flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5" /> {design.collection}
        </p>
      )}
      {design.fixed_gtin && (
        <p className="flex items-center gap-1.5 truncate">
          <Tag className="h-3.5 w-3.5" />
          <code className="font-mono text-xs text-foreground">{design.fixed_gtin}</code>
        </p>
      )}
      {(design.lens_width_mm != null || design.bridge_width_mm != null || design.temple_length_mm != null) && (
        <p className="flex items-center gap-1.5">
          <Ruler className="h-3.5 w-3.5" />
          {[design.lens_width_mm, design.bridge_width_mm, design.temple_length_mm]
            .filter(v => v != null)
            .join(" · ")} mm
        </p>
      )}
      {design.weight_g != null && (
        <p className="flex items-center gap-1.5">
          <Weight className="h-3.5 w-3.5" /> {design.weight_g} g
        </p>
      )}
      {design.master_udi_di_base && (
        <p className="flex items-center gap-1.5 truncate">
          <Barcode className="h-3.5 w-3.5" />
          <code className="font-mono text-xs text-foreground truncate">{design.master_udi_di_base}</code>
        </p>
      )}
    </CardContent>
    <CardFooter className="flex gap-2">
      <Button
        className="flex-1 transition-all duration-300 opacity-80 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0"
        size="sm"
        onClick={() => onProduce(design)}
      >
        Konfigurieren & Drucken
      </Button>
    </CardFooter>
    <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
        onClick={() => onEdit(design)}
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
        onClick={() => onDelete(design.id)}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  </Card>
);

/** Org designs tab content */
const OrgDesignsContent = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: designs, isLoading } = useOrgDesigns();
  const deleteDesign = useDeleteOrgDesign();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editDesign, setEditDesign] = useState<OrgDesign | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [produceDesign, setProduceDesign] = useState<{ id: string; name: string; udiDiBase?: string } | null>(null);
  const [labelData, setLabelData] = useState<ProductionSuccessResult | null>(null);
  const [sunglassesLogId, setSunglassesLogId] = useState<string | null>(null);

  const designParam = searchParams.get("design");
  useEffect(() => {
    if (designParam && designs) {
      const found = designs.find((d) => d.id === designParam);
      if (found) {
        setEditDesign(found);
        setSheetOpen(true);
      }
      setSearchParams((prev) => { prev.delete("design"); return prev; }, { replace: true });
    }
  }, [designs, designParam, setSearchParams]);

  const handleEdit = (design: OrgDesign) => { setEditDesign(design); setSheetOpen(true); };
  const handleCreate = () => { setEditDesign(null); setSheetOpen(true); };
  const handleSheetClose = () => { setSheetOpen(false); setEditDesign(null); };
  const handleProductionSuccess = (result: ProductionSuccessResult) => {
    setLabelData(result);
    if (result.mode === "sunglasses" || result.mode === "optical_sun") setSunglassesLogId(result.logId);
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div />
        <Button className="gap-2" onClick={handleCreate}>
          <Plus className="h-4 w-4" /> Neues Design
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}><CardContent className="pt-6"><Skeleton className="h-36 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : !designs?.length ? (
        <EmptyState icon={Glasses} title="Noch keine eigenen Designs" description="Lade deine eigenen Brillendesigns hoch und verwalte sie hier." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {designs.map((d) => (
            <OrgDesignCard key={d.id} design={d} onDelete={setDeleteTarget} onEdit={handleEdit} onProduce={(d) => setProduceDesign({ id: d.id, name: d.name, udiDiBase: d.master_udi_di_base ?? undefined })} />
          ))}
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={(v) => { if (!v) handleSheetClose(); }}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editDesign ? "Design bearbeiten" : "Eigenes Design anlegen"}</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <OrgDesignForm key={editDesign?.id ?? "new"} editDesign={editDesign} onSuccess={handleSheetClose} />
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Design entfernen?</AlertDialogTitle>
            <AlertDialogDescription>Das Design wird deaktiviert und steht nicht mehr zur Verfügung.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteTarget) deleteDesign.mutate(deleteTarget); setDeleteTarget(null); }}
            >Entfernen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ProductionModal
        open={!!produceDesign}
        onClose={() => setProduceDesign(null)}
        designId={produceDesign?.id ?? ""}
        designName={produceDesign?.name ?? ""}
        udiDiBase={produceDesign?.udiDiBase}
        onSuccess={handleProductionSuccess}
      />

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
    </>
  );
};

const MyDesigns = () => {
  useDocumentTitle("Meine Designs");
  const { hasOrgScope, hasLabelScope, primaryScope } = useAdminScopes();

  const hasBothScopes = hasOrgScope && hasLabelScope;
  const defaultTab = primaryScope === "label" ? "label" : "org";

  // If only one scope, render directly without tabs
  if (!hasBothScopes) {
    if (hasLabelScope && !hasOrgScope) {
      return (
        <div className="space-y-6">
          <h1 className="text-2xl font-semibold text-foreground animate-slide-left">Meine Designs</h1>
          <LabelAdminDesigns embedded />
        </div>
      );
    }
    if (!hasOrgScope) {
      return (
        <div className="space-y-6">
          <h1 className="text-2xl font-semibold text-foreground animate-slide-left">Meine Designs</h1>
          <EmptyState
            icon={Glasses}
            title="Organisation erforderlich"
            description="Tritt einer Organisation bei, um eigene Designs zu verwalten."
          />
        </div>
      );
    }
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-foreground animate-slide-left">Meine Designs</h1>
        <OrgDesignsContent />
      </div>
    );
  }

  // Both scopes — use tabs
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground animate-slide-left">Meine Designs</h1>
      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="org">Organisations-Designs</TabsTrigger>
          <TabsTrigger value="label">Label-Designs</TabsTrigger>
        </TabsList>
        <TabsContent value="org">
          <OrgDesignsContent />
        </TabsContent>
        <TabsContent value="label">
          <LabelAdminDesigns embedded />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MyDesigns;
