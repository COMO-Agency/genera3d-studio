import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface Design {
  id: string;
  name: string;
}

interface AddUdiDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  designs: Design[];
  onSubmit: (designId: string, udiValue: string, priceCents: number) => void;
  isPending: boolean;
}

const AddUdiDialog = ({ open, onOpenChange, designs, onSubmit, isPending }: AddUdiDialogProps) => {
  const [designId, setDesignId] = useState("");
  const [udiValue, setUdiValue] = useState("");
  const [price, setPrice] = useState("");

  const reset = () => {
    setDesignId("");
    setUdiValue("");
    setPrice("");
  };

  const handleOpenChange = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  const handleSubmit = () => {
    if (!designId || !udiValue.trim() || !price) return;
    // Normalize European decimal format (comma to dot)
    const normalizedPrice = price.replace(",", ".");
    const cents = Math.round(parseFloat(normalizedPrice) * 100);
    if (isNaN(cents) || cents < 0) {
      alert("Ungültiger Preis. Bitte geben Sie einen gültigen Preis ein (z.B. 25.00 oder 25,00).");
      return;
    }
    onSubmit(designId, udiValue.trim(), cents);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>UDI hinzufügen</DialogTitle>
          <DialogDescription>Einzelnen UDI-DI-Eintrag anlegen.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Design</Label>
            <Select value={designId} onValueChange={setDesignId}>
              <SelectTrigger><SelectValue placeholder="Design wählen" /></SelectTrigger>
              <SelectContent>
                {designs.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>UDI-DI Wert</Label>
            <Input value={udiValue} onChange={(e) => setUdiValue(e.target.value)} placeholder="z.B. 04260..." />
          </div>
          <div className="space-y-2">
            <Label>Preis (EUR)</Label>
            <Input type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="z.B. 25.00" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Abbrechen</Button>
          <Button onClick={handleSubmit} disabled={isPending || !designId || !udiValue.trim() || !price}>
            {isPending ? "Speichern…" : "Speichern"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddUdiDialog;
