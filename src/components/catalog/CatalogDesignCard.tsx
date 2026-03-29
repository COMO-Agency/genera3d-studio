import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Box, Pencil, Trash2 } from "lucide-react";
import FavoriteButton from "./FavoriteButton";

interface CatalogDesign {
  id: string;
  name: string;
  glb_preview_url: string | null;
  collectionName?: string;
  master_udi_di_base: string;
  weight_g: number | null;
  size: string | null;
}

interface CatalogDesignCardProps {
  design: CatalogDesign;
  index: number;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onOpenDetail: () => void;
  onConfigure?: () => void;
  isAdmin?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

const CatalogDesignCard = ({
  design,
  index,
  isFavorite,
  onToggleFavorite,
  onOpenDetail,
  onConfigure,
  isAdmin,
  onEdit,
  onDelete,
}: CatalogDesignCardProps) => {
  const imageSrc = design.glb_preview_url;
  const cName = design.collectionName ?? "";

  return (
    <Card
      className="flex flex-col group glass card-lift animate-slide-up relative"
      style={{ animationDelay: `${index * 80}ms` }}
      role="article"
      aria-label={`Design ${design.name}`}
    >
      {/* Admin controls */}
      {isAdmin && (
        <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div
            className="cursor-pointer flex-1"
            onClick={onOpenDetail}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && onOpenDetail()}
            aria-label={`${design.name} Details anzeigen`}
          >
            <CardTitle className="text-base">{design.name}</CardTitle>
            {cName && <span className="text-[10px] text-muted-foreground">{cName}</span>}
            <span className="block text-[9px] font-mono text-muted-foreground/70 mt-0.5" title="UDI-DI Basis">
              {design.master_udi_di_base}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <FavoriteButton isFavorite={isFavorite} onToggle={onToggleFavorite} />
            {design.weight_g && <Badge variant="outline" className="text-[10px]">{design.weight_g}g</Badge>}
            {design.size && <Badge variant="secondary" className="text-xs">{design.size}</Badge>}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1">
        <div
          className="h-40 rounded-md bg-muted flex items-center justify-center overflow-hidden relative cursor-pointer"
          onClick={onOpenDetail}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && onOpenDetail()}
          aria-label={`${design.name} Vorschau anzeigen`}
        >
          {imageSrc ? (
            <>
              <img
                src={imageSrc}
                alt={`Vorschau von ${design.name}`}
                className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110"
                loading="lazy"
              />
              <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </>
          ) : (
            <Box className="h-8 w-8 text-muted-foreground/40" aria-hidden="true" />
          )}
        </div>
      </CardContent>

      <CardFooter>
        {onConfigure ? (
          <Button
            className="flex-1 transition-all duration-300 opacity-80 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0"
            size="sm"
            onClick={onConfigure}
            aria-label={`${design.name} konfigurieren und drucken`}
          >
            Konfigurieren & Drucken
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground text-center w-full">
            Organisation erforderlich zum Drucken
          </p>
        )}
      </CardFooter>
    </Card>
  );
};

export default CatalogDesignCard;
