import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Design {
  id: string;
  name: string;
}

interface BatchImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  designs: Design[];
  onSubmit: (designId: string, udiValues: string[], priceCents: number) => void;
  isPending: boolean;
}

const BatchImportDialog = ({
  open,
  onOpenChange,
  designs,
  onSubmit,
  isPending,
}: BatchImportDialogProps) => {
  const [designId, setDesignId] = useState("");
  const [values, setValues] = useState("");
  const [price, setPrice] = useState("");

  const reset = () => {
    setDesignId("");
    setValues("");
    setPrice("");
  };

  const handleOpenChange = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  const handleSubmit = () => {
    if (!designId || !values.trim() || !price) return;
    // Normalize European decimal format (comma to dot)
    const normalizedPrice = price.replace(",", ".");
    const cents = Math.round(parseFloat(normalizedPrice) * 100);
    if (isNaN(cents) || cents < 0) {
      alert(
        "Ungültiger Preis. Bitte geben Sie einen gültigen Preis ein (z.B. 25.00 oder 25,00).",
      );
      return;
    }
    const parsed = values
      .split("\n")
      .map((v) => v.trim())
      .filter(Boolean);
    if (!parsed.length) return;
    onSubmit(designId, parsed, cents);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Batch-Import</DialogTitle>
          <DialogDescription>
            Mehrere UDI-DI-Werte auf einmal anlegen (eine pro Zeile).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Design</Label>
            <Select value={designId} onValueChange={setDesignId}>
              <SelectTrigger>
                <SelectValue placeholder="Design wählen" />
              </SelectTrigger>
              <SelectContent>
                {designs.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>UDI-DI Werte (eine pro Zeile)</Label>
            <Textarea
              rows={6}
              value={values}
              onChange={(e) => setValues(e.target.value)}
              placeholder={"04260001\n04260002\n04260003"}
            />
          </div>
          <div className="space-y-2">
            <Label>Einheitlicher Preis (EUR)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="z.B. 25.00"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Abbrechen
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || !designId || !values.trim() || !price}
          >
            {isPending ? "Importieren…" : "Importieren"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BatchImportDialog;
