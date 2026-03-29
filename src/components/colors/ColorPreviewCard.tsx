import { Trash2, Pipette, FlaskConical, Droplets } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import CmykIndicator from "@/components/CmykIndicator";
import type { OrgColor } from "@/hooks/useOrgColors";

const OPACITY_LABELS: Record<string, string> = {
  opak: "Opak",
  transparent: "Transparent",
  transluzent: "Transluzent",
};

interface Props {
  color: OrgColor;
  onDelete?: (id: string) => void;
  isGlobal?: boolean;
}

const ColorPreviewCard = ({ color: c, onDelete, isGlobal }: Props) => (
  <Card className="group relative animate-fade-in">
    <CardHeader className="pb-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          {/* Large swatch */}
          <div
            className="h-10 w-10 shrink-0 rounded-lg border border-border shadow-sm"
            style={{ backgroundColor: c.hex_preview || "hsl(var(--muted))" }}
          />
          <CardTitle className="text-base truncate">{c.name}</CardTitle>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {isGlobal && (
            <Badge variant="secondary" className="text-xs">Genera</Badge>
          )}
          <Badge variant="outline" className="text-xs">
            {c.color_type === "standard" ? "Standard" : "C1 Sonderfarbe"}
          </Badge>
        </div>
      </div>
    </CardHeader>
    <CardContent className="space-y-2 pt-0">
      {c.color_type === "standard" && c.color_code && (
        <p className="text-sm text-muted-foreground flex items-center gap-1.5">
          <Pipette className="h-3.5 w-3.5" /> Code:{" "}
          <code className="font-mono text-foreground">{c.color_code}</code>
        </p>
      )}

      {c.color_type === "custom_mix" && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <FlaskConical className="h-3.5 w-3.5" /> CMYKW-Mischung
          </p>
          <CmykIndicator
            cyan={c.cyan ?? 0}
            magenta={c.magenta ?? 0}
            yellow={c.yellow ?? 0}
            black={c.black ?? 0}
            white={c.white ?? 0}
            natural={c.natural_pct ?? 0}
          />
        </div>
      )}

      {c.opacity_type && c.opacity_type !== "opak" && (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Droplets className="h-3.5 w-3.5" /> {OPACITY_LABELS[c.opacity_type] ?? c.opacity_type}
        </p>
      )}

      {onDelete && !isGlobal && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-3 right-3 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
          onClick={() => onDelete(c.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </CardContent>
  </Card>
);

export default ColorPreviewCard;
