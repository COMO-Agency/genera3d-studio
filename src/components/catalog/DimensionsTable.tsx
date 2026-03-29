import { Separator } from "@/components/ui/separator";
import { Ruler, MoveHorizontal, ArrowLeftRight } from "lucide-react";

interface DimensionsTableProps {
  bridge_width_mm?: number | null;
  lens_width_mm?: number | null;
  temple_length_mm?: number | null;
}

const DimensionsTable = ({
  bridge_width_mm,
  lens_width_mm,
  temple_length_mm,
}: DimensionsTableProps) => {
  const hasAny =
    bridge_width_mm != null ||
    lens_width_mm != null ||
    temple_length_mm != null;
  if (!hasAny) return null;

  return (
    <>
      <Separator />
      <div className="space-y-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Maße
        </span>
        <div className="space-y-2">
          <Row
            icon={<ArrowLeftRight className="h-3.5 w-3.5" />}
            label="Stegbreite"
            value={bridge_width_mm}
          />
          <Row
            icon={<MoveHorizontal className="h-3.5 w-3.5" />}
            label="Glasbreite"
            value={lens_width_mm}
          />
          <Row
            icon={<Ruler className="h-3.5 w-3.5" />}
            label="Bügellänge"
            value={temple_length_mm}
          />
        </div>
      </div>
    </>
  );
};

const Row = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value?: number | null;
}) => (
  <div className="flex items-center justify-between">
    <span className="text-sm text-muted-foreground flex items-center gap-2">
      {icon} {label}
    </span>
    <span className="text-sm font-medium text-foreground">
      {value != null ? `${value} mm` : "—"}
    </span>
  </div>
);

export default DimensionsTable;
