import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import type { LabelUdiPoolEntry } from "@/hooks/useLabelUdiPool";

interface EditPriceDialogProps {
  entry: LabelUdiPoolEntry | null;
  onClose: () => void;
  onSubmit: (id: string, priceCents: number) => void;
  isPending: boolean;
}

const EditPriceDialog = ({
  entry,
  onClose,
  onSubmit,
  isPending,
}: EditPriceDialogProps) => {
  const [price, setPrice] = useState("");

  useEffect(() => {
    if (entry) setPrice((entry.price_cents / 100).toFixed(2));
  }, [entry]);

  const handleSubmit = () => {
    if (!entry) return;
    const cents = Math.round(parseFloat(price) * 100);
    if (isNaN(cents) || cents < 0) return;
    onSubmit(entry.id, cents);
  };

  return (
    <Dialog open={!!entry} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Preis bearbeiten</DialogTitle>
          <DialogDescription>UDI: {entry?.udi_di_value}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Neuer Preis (EUR)</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Abbrechen
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Speichern…" : "Speichern"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditPriceDialog;
