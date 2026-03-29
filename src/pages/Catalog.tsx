import { useState, useMemo, useCallback, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Search, X, Heart, Box, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/EmptyState";
import ProductionModal, {
  type ProductionSuccessResult,
} from "@/components/ProductionModal";
import UdiLabelPreview from "@/components/UdiLabelPreview";
import SunglassesGlassDataDialog from "@/components/SunglassesGlassDataDialog";
import DesignDetailSheet from "@/components/DesignDetailSheet";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useFavorites } from "@/hooks/useFavorites";
import { useFreeDesigns, type FreeDesign } from "@/hooks/useFreeDesigns";
import { useIsPlatformAdmin } from "@/hooks/useUserRole";
import { useProfile } from "@/hooks/useProfile";
import { useDeleteFreeDesign } from "@/hooks/useManageFreeDesigns";
import { useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import CatalogDesignCard from "@/components/catalog/CatalogDesignCard";
import FreeDesignForm from "@/components/catalog/FreeDesignForm";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const CatalogCardSkeleton = () => (
  <div className="flex flex-col rounded-lg border border-border bg-card p-4 space-y-3">
    <div className="flex items-start justify-between">
      <Skeleton className="h-5 w-28" />
      <Skeleton className="h-5 w-10 rounded-full" />
    </div>
    <Skeleton className="h-32 w-full rounded-md" />
    <Skeleton className="h-9 w-full" />
  </div>
);

type CatalogDesign = FreeDesign & { isOrgDesign: boolean };

const Catalog = () => {
  useDocumentTitle("Free Design Catalog");
  const { data: freeDesigns, isLoading } = useFreeDesigns();
  const { isPlatformAdmin: isAdmin, isLoading: roleLoading } =
    useIsPlatformAdmin();
  const { data: profile } = useProfile();
  const canProduce = !!profile?.org_id;
  const deleteFreeDesign = useDeleteFreeDesign();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedDesign, setSelectedDesign] = useState<{
    id: string;
    name: string;
    preselectedColor?: string;
    udiDiBase?: string;
  } | null>(null);
  const [detailDesign, setDetailDesign] = useState<CatalogDesign | null>(null);
  const [detailCollection, setDetailCollection] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState(() =>
    searchParams.get("tab") === "favorites" ? "favorites" : "all",
  );

  // Sync tab when URL param changes
  useEffect(() => {
    const tab = searchParams.get("tab");
    setActiveTab(tab === "favorites" ? "favorites" : "all");
  }, [searchParams]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editDesign, setEditDesign] = useState<FreeDesign | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Follow-up dialog state (rendered in parent to survive ProductionModal unmount)
  const [labelData, setLabelData] = useState<ProductionSuccessResult | null>(
    null,
  );
  const [sunglassesLogId, setSunglassesLogId] = useState<string | null>(null);

  const { favorites, toggle: toggleFavorite } = useFavorites();

  // Fetch collections for admin form
  const { data: collectionsRaw } = useQuery({
    queryKey: ["collections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collections")
        .select("id, name")
        .eq("is_active", true);
      if (error) throw error;
      return data ?? [];
    },
    enabled: isAdmin,
  });

  const allDesigns: CatalogDesign[] = useMemo(() => {
    return (freeDesigns ?? []).map((d) => ({
      ...d,
      isOrgDesign: false,
    }));
  }, [freeDesigns]);

  const collections = useMemo(() => {
    const map = new Map<string, CatalogDesign[]>();
    allDesigns.forEach((d) => {
      const key = d.collectionName;
      if (!map.has(key)) map.set(key, []);
      map.get(key)?.push(d);
    });
    return Array.from(map.entries()).map(([name, designs]) => ({
      name,
      designs,
    }));
  }, [allDesigns]);

  const filteredAll = useMemo(() => {
    if (!searchQuery.trim()) return allDesigns;
    const q = searchQuery.toLowerCase();
    return allDesigns.filter((d) => d.name.toLowerCase().includes(q));
  }, [searchQuery, allDesigns]);

  const isSearching = searchQuery.trim().length > 0;
  const favDesigns = useMemo(
    () => allDesigns.filter((d) => favorites.has(d.id)),
    [allDesigns, favorites],
  );

  useEffect(() => {
    const designId = searchParams.get("design");
    if (!designId || !freeDesigns) return;
    const found = allDesigns.find((d) => d.id === designId);
    if (found) {
      setDetailDesign(found);
      setDetailCollection(found.collectionName ?? "");
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, freeDesigns, allDesigns, setSearchParams]);

  const handleConfigure = useCallback(
    (design: { id: string; name: string; udiDiBase?: string }) => {
      setSelectedDesign({ ...design, udiDiBase: design.udiDiBase });
    },
    [],
  );

  const handleEdit = (design: CatalogDesign) => {
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

  const handleProductionSuccess = (result: ProductionSuccessResult) => {
    setLabelData(result);
    if (result.mode === "sunglasses" || result.mode === "optical_sun") {
      setSunglassesLogId(result.logId);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-foreground animate-slide-left">
          Free Design Catalog
        </h1>
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <CatalogCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (allDesigns.length === 0 && !isAdmin) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-foreground animate-slide-left">
          Free Design Catalog
        </h1>
        <EmptyState
          icon={Box}
          title="Noch keine freien Designs verfügbar"
          description="Der Administrator hat noch keine Designs hochgeladen."
        />
      </div>
    );
  }

  const renderGrid = (designs: CatalogDesign[]) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {designs.map((design, i) => (
        <CatalogDesignCard
          key={design.id}
          design={design}
          index={i}
          isFavorite={favorites.has(design.id)}
          onToggleFavorite={() => toggleFavorite(design.id)}
          onOpenDetail={() => {
            setDetailDesign(design);
            setDetailCollection(design.collectionName ?? "");
          }}
          onConfigure={
            canProduce
              ? () =>
                  handleConfigure({
                    id: design.id,
                    name: design.name,
                    udiDiBase: design.master_udi_di_base,
                  })
              : undefined
          }
          isAdmin={!roleLoading && isAdmin}
          onEdit={() => handleEdit(design)}
          onDelete={() => setDeleteTarget(design.id)}
        />
      ))}
    </div>
  );

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground animate-slide-left">
          Free Design Catalog
        </h1>
        {!roleLoading && isAdmin && (
          <Button className="gap-2" onClick={handleCreate}>
            <Plus className="h-4 w-4" /> Design hinzufügen
          </Button>
        )}
      </div>

      <div className="relative max-w-sm animate-fade-in">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Design suchen…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 pr-9"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isSearching ? (
        <div>
          <p className="text-sm text-muted-foreground mb-4">
            {filteredAll.length} Ergebnis{filteredAll.length !== 1 ? "se" : ""}
          </p>
          {filteredAll.length > 0 ? (
            renderGrid(filteredAll)
          ) : (
            <EmptyState
              icon={Search}
              title="Keine Designs gefunden"
              description="Versuche einen anderen Suchbegriff."
            />
          )}
        </div>
      ) : allDesigns.length === 0 ? (
        <EmptyState
          icon={Box}
          title="Noch keine freien Designs"
          description="Füge das erste Design hinzu."
        />
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="overflow-x-auto w-full justify-start">
            <TabsTrigger value="all">Alle</TabsTrigger>
            <TabsTrigger value="favorites" className="gap-1.5">
              <Heart className="h-3 w-3" /> Favoriten
              {favDesigns.length > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1 h-4">
                  {favDesigns.length}
                </Badge>
              )}
            </TabsTrigger>
            {collections.map((c) => (
              <TabsTrigger key={c.name} value={c.name}>
                {c.name}
                <Badge
                  variant="secondary"
                  className="text-[10px] px-1 h-4 ml-1.5"
                >
                  {c.designs.length}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="all">{renderGrid(allDesigns)}</TabsContent>
          <TabsContent value="favorites">
            {favDesigns.length > 0 ? (
              renderGrid(favDesigns)
            ) : (
              <EmptyState
                icon={Heart}
                title="Keine Favoriten"
                description="Markiere Designs mit dem Herz-Icon."
              />
            )}
          </TabsContent>
          {collections.map((c) => (
            <TabsContent key={c.name} value={c.name}>
              {renderGrid(c.designs)}
            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* Admin: Create/Edit Sheet */}
      <Sheet
        open={sheetOpen}
        onOpenChange={(v) => {
          if (!v) handleSheetClose();
        }}
      >
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editDesign ? "Free Design bearbeiten" : "Neues Free Design"}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <FreeDesignForm
              key={editDesign?.id ?? "new"}
              editDesign={editDesign}
              collections={collectionsRaw ?? []}
              onSuccess={handleSheetClose}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Admin: Delete confirm */}
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
              Das Design wird aus dem Free Catalog entfernt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) deleteFreeDesign.mutate(deleteTarget);
                setDeleteTarget(null);
              }}
            >
              Entfernen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DesignDetailSheet
        open={!!detailDesign}
        onClose={() => setDetailDesign(null)}
        design={detailDesign}
        collectionName={detailCollection}
        materialName="Digital Eyewear"
        onConfigure={canProduce ? handleConfigure : undefined}
      />

      <ProductionModal
        open={!!selectedDesign}
        onClose={() => setSelectedDesign(null)}
        designId={selectedDesign?.id ?? ""}
        designName={selectedDesign?.name ?? ""}
        preselectedColor={selectedDesign?.preselectedColor}
        udiDiBase={selectedDesign?.udiDiBase}
        onSuccess={handleProductionSuccess}
      />

      {/* Follow-up dialogs rendered in parent — survive ProductionModal unmount */}
      <UdiLabelPreview
        open={!!labelData}
        onClose={() => setLabelData(null)}
        data={
          labelData
            ? {
                designName: labelData.designName,
                udiPi: labelData.udiPi,
                fullGs1: labelData.fullGs1,
                mode: labelData.mode,
                orgName: labelData.orgName,
                contactPerson: labelData.contactPerson,
                orgAddress: labelData.orgAddress,
              }
            : null
        }
      />

      {sunglassesLogId && (
        <SunglassesGlassDataDialog
          open={!!sunglassesLogId}
          onClose={() => setSunglassesLogId(null)}
          productionLogId={sunglassesLogId}
        />
      )}
    </div>
  );
};

export default Catalog;
