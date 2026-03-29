import { Card, CardContent } from "@/components/ui/card";
import { Package, CheckCircle, Archive } from "lucide-react";

interface UdiPoolStatsProps {
  total: number;
  available: number;
  sold: number;
}

const UdiPoolStats = ({ total, available, sold }: UdiPoolStatsProps) => (
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
    {[
      { label: "Gesamt", value: total, icon: Package },
      { label: "Verfügbar", value: available, icon: CheckCircle },
      { label: "Verkauft", value: sold, icon: Archive },
    ].map(({ label, value, icon: Icon }) => (
      <Card key={label}>
        <CardContent className="flex items-center gap-3 p-4">
          <Icon className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

export default UdiPoolStats;
