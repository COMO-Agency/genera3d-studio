/**
 * Optimierte TableRow-Komponente mit React.memo
 * Phase 2: Performance-Optimierung
 */

import { memo } from "react";
import { TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import {
  modeLabelMap,
  productionStatusLabelMap,
  productionStatusColorMap,
} from "@/lib/constants";
import {
  ClipboardCheck,
  XCircle,
  Copy,
  Check,
  ShieldCheck,
} from "lucide-react";

interface ProductionLog {
  id: string;
  design_name: string | null;
  design_version: number | null;
  status: string | null;
  mode: string | null;
  color: string | null;
  color_name: string | null;
  customer_ref: string | null;
  assigned_udi_pi: string | null;
  created_at: string | null;
  design_id: string | null;
  org_id: string | null;
}

interface OptimizedTableRowProps {
  log: ProductionLog;
  index: number;
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
  onQcCheck: (log: ProductionLog) => void;
  onCancel: (log: ProductionLog) => void;
  onCert: (log: ProductionLog) => void;
  onPsaCert: (log: ProductionLog) => void;
}

// Memoized row component to prevent unnecessary re-renders
export const OptimizedTableRow = memo(function OptimizedTableRow({
  log,
  index,
  copiedId,
  onCopy,
  onQcCheck,
  onCancel,
  onCert,
  onPsaCert,
}: OptimizedTableRowProps) {
  const isCopied = copiedId === `pi-${log.id}`;

  return (
    <TableRow
      className="animate-fade-in"
      style={{ animationDelay: `${index * 30}ms` }}
    >
      <TableCell>
        <div>
          <span className="font-medium text-foreground">
            {log.design_name ?? "Unbekannt"}
          </span>
          <span className="block text-xs text-muted-foreground">
            V{log.design_version ?? "—"}
          </span>
        </div>
      </TableCell>
      <TableCell>
        <Badge
          variant="outline"
          className={`text-xs ${productionStatusColorMap[log.status ?? ""] ?? ""}`}
        >
          {productionStatusLabelMap[log.status ?? ""] ?? log.status ?? "—"}
        </Badge>
      </TableCell>
      <TableCell>
        {log.status === "qc_pending" ? (
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1"
              onClick={() => onQcCheck(log)}
            >
              <ClipboardCheck className="h-3 w-3" /> Prüfen
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
              onClick={() => onCancel(log)}
            >
              <XCircle className="h-3 w-3" /> Storno
            </Button>
          </div>
        ) : log.status === "qc_passed" ? (
          <span className="text-success text-xs">✓ Bestanden</span>
        ) : log.status === "qc_failed" ? (
          <span className="text-destructive text-xs">✗ Nicht bestanden</span>
        ) : log.status === "cancelled" ? (
          <span className="text-muted-foreground text-xs">⊘ Storniert</span>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        )}
      </TableCell>
      <TableCell>
        <span className="text-sm text-muted-foreground">
          {modeLabelMap[log.mode ?? ""] ?? log.mode ?? "—"}
        </span>
      </TableCell>
      <TableCell>
        {log.color ? (
          <Badge variant="secondary" className="text-xs capitalize">
            {log.color_name ?? log.color}
          </Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell>
        <span className="text-xs text-muted-foreground">
          {log.customer_ref ?? "—"}
        </span>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <code className="text-xs font-mono font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
            {log.assigned_udi_pi ?? "—"}
          </code>
          {log.assigned_udi_pi && (
            <button
              onClick={() =>
                onCopy(log.assigned_udi_pi as string, `pi-${log.id}`)
              }
              className="text-muted-foreground hover:text-foreground"
              aria-label="UDI-PI kopieren"
            >
              {isCopied ? (
                <Check className="h-3 w-3 text-success" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </button>
          )}
        </div>
      </TableCell>
      <TableCell>
        {log.status !== "cancelled" &&
          log.design_name &&
          (log.mode === "sunglasses" ? (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1"
              onClick={() => onPsaCert(log)}
            >
              <ShieldCheck className="h-3 w-3" /> PSA-CE
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1"
              onClick={() => onCert(log)}
            >
              <ShieldCheck className="h-3 w-3" /> MDR
            </Button>
          ))}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
        {log.created_at && !isNaN(new Date(log.created_at).getTime())
          ? format(new Date(log.created_at), "dd.MM.yyyy HH:mm")
          : "—"}
      </TableCell>
    </TableRow>
  );
});

// Deep comparison for production logs
export const areLogsEqual = (
  prevLog: ProductionLog,
  nextLog: ProductionLog,
): boolean => {
  return (
    prevLog.id === nextLog.id &&
    prevLog.status === nextLog.status &&
    prevLog.design_name === nextLog.design_name &&
    prevLog.assigned_udi_pi === nextLog.assigned_udi_pi
  );
};
