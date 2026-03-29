import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCustomerSession } from "@/hooks/useCustomerSession";

interface CustomerSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CustomerSessionDialog = ({ open, onOpenChange }: CustomerSessionDialogProps) => {
  const [name, setName] = useState("");
  const { startSession } = useCustomerSession();

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setName("");
    onOpenChange(nextOpen);
  };

  const handleStart = () => {
    if (!name.trim()) return;
    startSession(name.trim());
    setName("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Druckauftrag anlegen</DialogTitle>
          <DialogDescription>Alle Druckaufträge werden mit diesem Kunden verknüpft.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label>Kundenname / Referenz</Label>
          <Input
            placeholder="z.B. Max Mustermann"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleStart()}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Abbrechen</Button>
          <Button disabled={!name.trim()} onClick={handleStart}>Beratung starten</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerSessionDialog;
