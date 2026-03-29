import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2 } from "lucide-react";
import type { LabelUdiPoolEntry } from "@/hooks/useLabelUdiPool";

const fmt = (cents: number) =>
  (cents / 100).toFixed(2).replace(".", ",") + " €";

interface UdiPoolTableProps {
  pool: LabelUdiPoolEntry[];
  onEdit: (entry: LabelUdiPoolEntry) => void;
  onDelete: (entry: LabelUdiPoolEntry) => void;
}

const UdiPoolTable = ({ pool, onEdit, onDelete }: UdiPoolTableProps) => (
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Design</TableHead>
        <TableHead>UDI-DI</TableHead>
        <TableHead>Preis</TableHead>
        <TableHead>Status</TableHead>
        <TableHead className="text-right">Aktionen</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {pool.length === 0 && (
        <TableRow>
          <TableCell
            colSpan={5}
            className="text-center text-muted-foreground py-8"
          >
            Noch keine UDI-Einträge vorhanden.
          </TableCell>
        </TableRow>
      )}
      {pool.map((entry) => (
        <TableRow key={entry.id}>
          <TableCell className="font-medium">{entry.design_name}</TableCell>
          <TableCell className="font-mono text-xs">
            {entry.udi_di_value}
          </TableCell>
          <TableCell>{fmt(entry.price_cents)}</TableCell>
          <TableCell>
            <Badge variant={entry.is_available ? "default" : "secondary"}>
              {entry.is_available ? "Verfügbar" : "Verkauft"}
            </Badge>
          </TableCell>
          <TableCell className="text-right space-x-1">
            {entry.is_available && (
              <>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onEdit(entry)}
                  aria-label={`${entry.design_name} bearbeiten`}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onDelete(entry)}
                  aria-label={`${entry.design_name} löschen`}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </>
            )}
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

export default UdiPoolTable;
