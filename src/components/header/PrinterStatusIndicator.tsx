import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Printer } from "lucide-react";
import { cn } from "@/lib/utils";

interface PrinterStatusIndicatorProps {
  settings?: Record<string, unknown> | string | null;
}

const PrinterStatusIndicator = ({ settings }: PrinterStatusIndicatorProps) => {
  const raw = (settings as Record<string, unknown> | null)?.printers;
  const printers: Array<{ status: string; name: string }> = Array.isArray(raw) ? raw : [];
  const activePrinter = printers.find((p) => p.status === "online");
  const busyPrinter = printers.find((p) => p.status === "printing");
  const status = busyPrinter ? "printing" : activePrinter ? "ready" : printers.length > 0 ? "offline" : "ready";

  const dotColor = status === "printing"
    ? "bg-warning animate-pulse"
    : status === "ready"
      ? "bg-[hsl(var(--success))]"
      : "bg-destructive";

  const label = status === "printing"
    ? `Druckt: ${busyPrinter?.name ?? "..."}`
    : status === "ready"
      ? "Drucker bereit"
      : "Drucker offline";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 cursor-default">
            <Printer className="h-3.5 w-3.5 text-muted-foreground" />
            <span className={cn("h-2 w-2 rounded-full", dotColor)} />
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="text-xs">{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default PrinterStatusIndicator;
