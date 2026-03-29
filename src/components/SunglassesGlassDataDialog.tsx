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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/utils";
import { useProfile } from "@/hooks/useProfile";

interface SunglassesGlassDataDialogProps {
  open: boolean;
  onClose: () => void;
  productionLogId: string;
}

const filterCategories = [
  { value: "0", label: "Kategorie 0 — 80–100% Lichtdurchlässigkeit" },
  { value: "1", label: "Kategorie 1 — 43–80% Lichtdurchlässigkeit" },
  { value: "2", label: "Kategorie 2 — 18–43% Lichtdurchlässigkeit" },
  { value: "3", label: "Kategorie 3 — 8–18% Lichtdurchlässigkeit" },
  { value: "4", label: "Kategorie 4 — 3–8% Lichtdurchlässigkeit" },
];

const SunglassesGlassDataDialog = ({
  open,
  onClose,
  productionLogId,
}: SunglassesGlassDataDialogProps) => {
  const { data: profile } = useProfile();
  const [glassType, setGlassType] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [glassManufacturer, setGlassManufacturer] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setGlassType("");
    setFilterCategory("");
    setGlassManufacturer("");
    setNotes("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!profile?.org_id || loading) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("sunglasses_glass_data").insert({
        production_log_id: productionLogId,
        org_id: profile.org_id,
        glass_type: glassType.trim(),
        filter_category: filterCategory,
        glass_manufacturer: glassManufacturer.trim() || null,
        notes: notes.trim() || null,
      });
      if (error) throw error;
      toast({
        title: "Glasdaten gespeichert",
        description: "Sonnenbrillen-Glasdaten wurden dokumentiert.",
      });
      handleClose();
    } catch (err: unknown) {
      toast({
        title: "Fehler",
        description: getErrorMessage(err),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sonnenbrillen-Glasdaten (PSA)</DialogTitle>
          <DialogDescription>
            Als Hersteller der Sonnenbrille (PSA Kat. I) dokumentieren Sie die
            eingesetzten Gläser.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Glastyp *</Label>
            <Select value={glassType} onValueChange={setGlassType}>
              <SelectTrigger>
                <SelectValue placeholder="Glastyp wählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="plano">Plan-Verglasung (Plano)</SelectItem>
                <SelectItem value="korrektion">Korrektionsglas</SelectItem>
                <SelectItem value="polarisiert">Polarisiert</SelectItem>
                <SelectItem value="photochrom">Photochrom</SelectItem>
                <SelectItem value="sonstige">Sonstige</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>UV-Schutzklasse / Filterkategorie *</Label>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Kategorie wählen" />
              </SelectTrigger>
              <SelectContent>
                {filterCategories.map((fc) => (
                  <SelectItem key={fc.value} value={fc.value}>
                    {fc.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Glashersteller</Label>
            <Input
              placeholder="z.B. Essilor, Zeiss, Rodenstock"
              value={glassManufacturer}
              onChange={(e) => setGlassManufacturer(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Bemerkungen</Label>
            <Textarea
              placeholder="Weitere Angaben zu den Gläsern…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Später
          </Button>
          <Button
            disabled={!glassType || !filterCategory || loading}
            onClick={handleSubmit}
          >
            {loading ? "Wird gespeichert…" : "Glasdaten speichern"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SunglassesGlassDataDialog;
