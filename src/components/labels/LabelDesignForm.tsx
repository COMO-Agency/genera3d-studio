import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateLabelDesign, useUpdateLabelDesign, useUploadLabelDesignImage, type LabelDesign } from "@/hooks/useLabelDesigns";

interface Props {
  labelId: string;
  editDesign?: LabelDesign | null;
  onSuccess?: () => void;
}

const LabelDesignForm = ({ labelId, editDesign, onSuccess }: Props) => {
  const [name, setName] = useState("");
  const [udiDiBase, setUdiDiBase] = useState("");
  const [lensWidth, setLensWidth] = useState("");
  const [bridgeWidth, setBridgeWidth] = useState("");
  const [templeLength, setTempleLength] = useState("");
  const [weight, setWeight] = useState("");
  const [manufacturerName, setManufacturerName] = useState("");
  const [manufacturerAddress, setManufacturerAddress] = useState("");
  const [manufacturerCity, setManufacturerCity] = useState("");
  const [manufacturerAtu, setManufacturerAtu] = useState("");
  const [manufacturerContact, setManufacturerContact] = useState("");
  const [mdrPerson, setMdrPerson] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);

  const createDesign = useCreateLabelDesign();
  const updateDesign = useUpdateLabelDesign();
  const uploadImage = useUploadLabelDesignImage();

  // Populate form when editing
  useEffect(() => {
    if (editDesign) {
      setName(editDesign.name);
      setUdiDiBase(editDesign.master_udi_di_base);
      setLensWidth(editDesign.lens_width_mm != null ? String(editDesign.lens_width_mm) : "");
      setBridgeWidth(editDesign.bridge_width_mm != null ? String(editDesign.bridge_width_mm) : "");
      setTempleLength(editDesign.temple_length_mm != null ? String(editDesign.temple_length_mm) : "");
      setWeight(editDesign.weight_g != null ? String(editDesign.weight_g) : "");
      setManufacturerName(editDesign.manufacturer_name ?? "");
      setManufacturerAddress(editDesign.manufacturer_address ?? "");
      setManufacturerCity(editDesign.manufacturer_city ?? "");
      setManufacturerAtu(editDesign.manufacturer_atu ?? "");
      setManufacturerContact(editDesign.manufacturer_contact ?? "");
      setMdrPerson(editDesign.mdr_responsible_person ?? "");
    }
  }, [editDesign]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !udiDiBase.trim()) return;

    try {
      let image_url: string | undefined;
      if (imageFile) {
        image_url = await uploadImage.mutateAsync({ file: imageFile, labelId });
      }

      const payload = {
        label_id: labelId,
        name: name.trim(),
        master_udi_di_base: udiDiBase.trim(),
        image_url: image_url ?? editDesign?.image_url ?? undefined,
        lens_width_mm: lensWidth && !isNaN(Number(lensWidth)) ? Number(lensWidth) : undefined,
        bridge_width_mm: bridgeWidth && !isNaN(Number(bridgeWidth)) ? Number(bridgeWidth) : undefined,
        temple_length_mm: templeLength && !isNaN(Number(templeLength)) ? Number(templeLength) : undefined,
        weight_g: weight && !isNaN(Number(weight)) ? Number(weight) : undefined,
        manufacturer_name: manufacturerName || undefined,
        manufacturer_address: manufacturerAddress || undefined,
        manufacturer_city: manufacturerCity || undefined,
        manufacturer_atu: manufacturerAtu || undefined,
        manufacturer_contact: manufacturerContact || undefined,
        mdr_responsible_person: mdrPerson || undefined,
      };

      if (editDesign) {
        await updateDesign.mutateAsync({ id: editDesign.id, ...payload });
      } else {
        await createDesign.mutateAsync(payload);
      }

      onSuccess?.();
    } catch {
      // Mutation onError handlers display toast
    }
  };

  const isPending = createDesign.isPending || updateDesign.isPending || uploadImage.isPending;
  const isEditing = !!editDesign;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Bild (optional)</Label>
        <Input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} />
        {isEditing && editDesign.image_url && !imageFile && (
          <p className="text-xs text-muted-foreground">Aktuelles Bild bleibt erhalten, wenn kein neues hochgeladen wird.</p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label>Designname *</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="space-y-1.5">
        <Label>UDI-DI (Master) *</Label>
        <Input value={udiDiBase} onChange={(e) => setUdiDiBase(e.target.value)} placeholder="z.B. 04260745960XXX" required />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5"><Label>Linse (mm)</Label><Input type="number" min="0" step="0.1" value={lensWidth} onChange={(e) => setLensWidth(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Steg (mm)</Label><Input type="number" min="0" step="0.1" value={bridgeWidth} onChange={(e) => setBridgeWidth(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Bügel (mm)</Label><Input type="number" min="0" step="0.1" value={templeLength} onChange={(e) => setTempleLength(e.target.value)} /></div>
      </div>
      <div className="space-y-1.5"><Label>Gewicht (g)</Label><Input type="number" min="0" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} /></div>

      <hr className="border-border" />
      <p className="text-sm font-medium text-foreground">Herstellerdaten</p>
      <div className="space-y-1.5"><Label>Herstellername</Label><Input value={manufacturerName} onChange={(e) => setManufacturerName(e.target.value)} /></div>
      <div className="space-y-1.5"><Label>Adresse</Label><Input value={manufacturerAddress} onChange={(e) => setManufacturerAddress(e.target.value)} /></div>
      <div className="space-y-1.5"><Label>Stadt / PLZ</Label><Input value={manufacturerCity} onChange={(e) => setManufacturerCity(e.target.value)} /></div>
      <div className="space-y-1.5"><Label>UID-Nummer</Label><Input value={manufacturerAtu} onChange={(e) => setManufacturerAtu(e.target.value)} /></div>
      <div className="space-y-1.5"><Label>Kontakt / E-Mail</Label><Input value={manufacturerContact} onChange={(e) => setManufacturerContact(e.target.value)} /></div>
      <div className="space-y-1.5"><Label>MDR-Bevollmächtigter</Label><Input value={mdrPerson} onChange={(e) => setMdrPerson(e.target.value)} /></div>

      <Button type="submit" className="w-full" disabled={isPending || !name.trim() || !udiDiBase.trim()}>
        {isPending ? "Speichern…" : isEditing ? "Design aktualisieren" : "Design anlegen"}
      </Button>
    </form>
  );
};

export default LabelDesignForm;
