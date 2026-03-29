import { useMemo, useState } from "react";
import { Plus, Palette, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import EmptyState from "@/components/EmptyState";
import ColorPreviewCard from "@/components/colors/ColorPreviewCard";
import CreateColorDialog from "@/components/colors/CreateColorDialog";
import { useOrgColors, useDeleteOrgColor } from "@/hooks/useOrgColors";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useProfile } from "@/hooks/useProfile";


const ColorCatalog = () => {
  useDocumentTitle("Farbkatalog");
  const { data: colors, isLoading } = useOrgColors();
  const { data: profile } = useProfile();
  const userOrgId = profile?.org_id;
  const deleteColor = useDeleteOrgColor();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const hasOrg = !!userOrgId;

  const { globalColors, ownColors } = useMemo(() => {
    if (!colors || !userOrgId) return { globalColors: [], ownColors: [] };
    return {
      globalColors: colors.filter((c) => c.org_id !== userOrgId),
      ownColors: colors.filter((c) => c.org_id === userOrgId),
    };
  }, [colors, userOrgId]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground animate-slide-left">Farbkatalog</h1>
        {hasOrg && (
          <Button className="gap-2" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" /> Eigene Farbe anlegen
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}><CardContent className="pt-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : !hasOrg ? (
        <EmptyState
          icon={Palette}
          title="Organisation erforderlich"
          description="Tritt einer Organisation bei, um Farben zu verwalten."
        />
      ) : !colors?.length ? (
        <EmptyState
          icon={Palette}
          title="Noch keine Farben angelegt"
          description="Lege deine erste Farbe an, um sie bei Druckaufträgen auszuwählen."
        />
      ) : (
        <>
          {/* --- Own org colors --- */}
          <section className="space-y-3">
            <h2 className="text-lg font-medium text-foreground flex items-center gap-2">
              <Palette className="h-4 w-4 text-primary" />
              Eigene Farben
            </h2>
            {ownColors.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Du hast noch keine eigenen Farben angelegt.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {ownColors.map((c) => (
                  <ColorPreviewCard key={c.id} color={c} onDelete={setDeleteTarget} />
                ))}
              </div>
            )}
          </section>

          {/* --- Genera standard colors --- */}
          {globalColors.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-medium text-foreground flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                Genera Standardfarben
              </h2>
              <p className="text-xs text-muted-foreground">
                Diese Farben werden von Genera bereitgestellt und sind für alle Organisationen verfügbar.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {globalColors.map((c) => (
                  <ColorPreviewCard key={c.id} color={c} isGlobal />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <CreateColorDialog open={dialogOpen} onOpenChange={setDialogOpen} />

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Farbe entfernen?</AlertDialogTitle>
            <AlertDialogDescription>Die Farbe wird deaktiviert und steht nicht mehr zur Auswahl.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteTarget) deleteColor.mutate(deleteTarget); setDeleteTarget(null); }}
            >
              Entfernen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ColorCatalog;
