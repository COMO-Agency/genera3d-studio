import { useState } from "react";
import {
  Plus,
  Trash2,
  Pencil,
  Ruler,
  Weight,
  Barcode,
  Building2,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import EmptyState from "@/components/EmptyState";
import LabelDesignForm from "@/components/labels/LabelDesignForm";
import {
  useLabelDesigns,
  useDeleteLabelDesign,
  type LabelDesign,
} from "@/hooks/useLabelDesigns";
import { useIsLabelAdmin } from "@/hooks/useLabelMembers";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

const DesignCard = ({
  design,
  onDelete,
  onEdit,
}: {
  design: LabelDesign;
  onDelete: (id: string) => void;
  onEdit: (d: LabelDesign) => void;
}) => (
  <Card className="group relative animate-fade-in overflow-hidden">
    {design.image_url && (
      <div className="h-36 w-full bg-muted overflow-hidden">
        <img
          src={design.image_url}
          alt={design.name}
          className="h-full w-full object-contain"
        />
      </div>
    )}
    <CardHeader className="pb-2">
      <div className="flex items-center justify-between gap-2">
        <CardTitle className="text-base truncate">{design.name}</CardTitle>
        <Badge variant="outline" className="text-xs shrink-0">
          v{design.version}
        </Badge>
      </div>
    </CardHeader>
    <CardContent className="space-y-1.5 text-sm text-muted-foreground">
      {(design.lens_width_mm != null ||
        design.bridge_width_mm != null ||
        design.temple_length_mm != null) && (
        <p className="flex items-center gap-1.5">
          <Ruler className="h-3.5 w-3.5" />
          {[
            design.lens_width_mm,
            design.bridge_width_mm,
            design.temple_length_mm,
          ]
            .filter((v) => v != null)
            .join(" · ")}{" "}
          mm
        </p>
      )}
      {design.weight_g != null && (
        <p className="flex items-center gap-1.5">
          <Weight className="h-3.5 w-3.5" /> {design.weight_g} g
        </p>
      )}
      <p className="flex items-center gap-1.5 truncate">
        <Barcode className="h-3.5 w-3.5" />
        <code className="font-mono text-xs text-foreground truncate">
          {design.master_udi_di_base}
        </code>
      </p>
      {design.manufacturer_name && (
        <p className="flex items-center gap-1.5">
          <Building2 className="h-3.5 w-3.5" /> {design.manufacturer_name}
        </p>
      )}
      {design.mdr_responsible_person && (
        <p className="flex items-center gap-1.5">
          <UserCheck className="h-3.5 w-3.5" /> {design.mdr_responsible_person}
        </p>
      )}
    </CardContent>
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

interface LabelAdminDesignsProps {
  embedded?: boolean;
}

const LabelAdminDesigns = ({ embedded = false }: LabelAdminDesignsProps) => {
  useDocumentTitle(embedded ? null : "Label – Designs");
  const { labelId } = useIsLabelAdmin();
  const { data: designs, isLoading } = useLabelDesigns(labelId ?? undefined);
  const deleteDesign = useDeleteLabelDesign();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editDesign, setEditDesign] = useState<LabelDesign | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleEdit = (design: LabelDesign) => {
    setEditDesign(design);
    setSheetOpen(true);
  };

  const handleCreate = () => {
    setEditDesign(null);
    setSheetOpen(true);
  };

  const handleSheetClose = () => {
    setSheetOpen(false);
    setEditDesign(null);
  };

  if (!labelId)
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
        Kein Label zugewiesen. Bitte zuerst eine Label-Mitgliedschaft anlegen.
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Label-Designs</h2>
        <Button className="gap-2" onClick={handleCreate}>
          <Plus className="h-4 w-4" /> Neues Design
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-36 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !designs?.length ? (
        <EmptyState
          icon={Barcode}
          title="Keine Designs"
          description="Lege Label-Designs an, die Optiker abonnieren können."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {designs.map((d) => (
            <DesignCard
              key={d.id}
              design={d}
              onDelete={setDeleteTarget}
              onEdit={handleEdit}
            />
          ))}
        </div>
      )}

      <Sheet
        open={sheetOpen}
        onOpenChange={(v) => {
          if (!v) handleSheetClose();
        }}
      >
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editDesign ? "Label-Design bearbeiten" : "Label-Design anlegen"}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <LabelDesignForm
              key={editDesign?.id ?? "new"}
              labelId={labelId}
              editDesign={editDesign}
              onSuccess={handleSheetClose}
            />
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(v) => {
          if (!v) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Design entfernen?</AlertDialogTitle>
            <AlertDialogDescription>
              Das Design wird deaktiviert.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget && labelId)
                  deleteDesign.mutate({ id: deleteTarget, labelId });
                setDeleteTarget(null);
              }}
            >
              Entfernen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LabelAdminDesigns;
