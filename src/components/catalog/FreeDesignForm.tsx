import { useState, useRef, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImagePlus, Loader2 } from "lucide-react";
import {
  useCreateFreeDesign,
  useUpdateFreeDesign,
  useUploadFreeDesignImage,
  type FreeDesignInput,
} from "@/hooks/useManageFreeDesigns";
import type { FreeDesign } from "@/hooks/useFreeDesigns";

interface Props {
  onSuccess?: () => void;
  editDesign?: FreeDesign | null;
  collections: { id: string; name: string }[];
}

const FreeDesignForm = ({ onSuccess, editDesign, collections }: Props) => {
  const create = useCreateFreeDesign();
  const update = useUpdateFreeDesign();
  const uploadImg = useUploadFreeDesignImage();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [collectionId, setCollectionId] = useState("");
  const [size, setSize] = useState("");
  const [constructionType, setConstructionType] = useState("full_frame");
  const [serialPrefix, setSerialPrefix] = useState("");
  const [fixedGtin, setFixedGtin] = useState("");
  const [lensWidth, setLensWidth] = useState("");
  const [bridgeWidth, setBridgeWidth] = useState("");
  const [templeLength, setTempleLength] = useState("");
  const [weight, setWeight] = useState("");
  const [udiDiBase, setUdiDiBase] = useState("");
  const [mfgName, setMfgName] = useState("");
  const [mfgAddress, setMfgAddress] = useState("");
  const [mfgCity, setMfgCity] = useState("");
  const [mfgAtu, setMfgAtu] = useState("");
  const [mfgContact, setMfgContact] = useState("");

  useEffect(() => {
    if (editDesign) {
      setName(editDesign.name);
      setImagePreview(editDesign.glb_preview_url);
      setCollectionId(editDesign.collection_id ?? "");
      setSize(editDesign.size ?? "");
      setConstructionType(editDesign.construction_type ?? "full_frame");
      setSerialPrefix(editDesign.serial_prefix ?? "");
      setFixedGtin(editDesign.fixed_gtin ?? "");
      setLensWidth(editDesign.lens_width_mm?.toString() ?? "");
      setBridgeWidth(editDesign.bridge_width_mm?.toString() ?? "");
      setTempleLength(editDesign.temple_length_mm?.toString() ?? "");
      setWeight(editDesign.weight_g?.toString() ?? "");
      setUdiDiBase(editDesign.master_udi_di_base ?? "");
      setMfgName(editDesign.manufacturer_name ?? "");
      setMfgAddress(editDesign.manufacturer_address ?? "");
      setMfgCity(editDesign.manufacturer_city ?? "");
      setMfgAtu(editDesign.manufacturer_atu ?? "");
      setMfgContact(editDesign.manufacturer_contact ?? "");
    } else {
      setName(""); setImagePreview(null); setImageFile(null);
      setCollectionId(""); setSize(""); setConstructionType("full_frame");
      setSerialPrefix(""); setFixedGtin("");
      setLensWidth(""); setBridgeWidth(""); setTempleLength(""); setWeight("");
      setUdiDiBase(""); setMfgName(""); setMfgAddress(""); setMfgCity("");
      setMfgAtu(""); setMfgContact("");
    }
  }, [editDesign]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const isPending = create.isPending || update.isPending || uploadImg.isPending;
  const isEditing = !!editDesign;

  const safeFloat = (v: string) => { const n = parseFloat(v); return isNaN(n) ? null : n; };

  const handleSubmit = async () => {
    // Early exit if already processing
    if (isPending) return;
    if (!name.trim() || !udiDiBase.trim()) return;

    try {
    let imgUrl: string | undefined;
    if (imageFile) {
      imgUrl = await uploadImg.mutateAsync({ file: imageFile });
    }

    const input: FreeDesignInput = {
      name: name.trim(),
      master_udi_di_base: udiDiBase.trim(),
      collection_id: collectionId || null,
      size: size || null,
      construction_type: constructionType || null,
      serial_prefix: serialPrefix.trim() || null,
      fixed_gtin: fixedGtin.trim() || null,
      lens_width_mm: lensWidth.trim() ? safeFloat(lensWidth) : null,
      bridge_width_mm: bridgeWidth.trim() ? safeFloat(bridgeWidth) : null,
      temple_length_mm: templeLength.trim() ? safeFloat(templeLength) : null,
      weight_g: weight.trim() ? safeFloat(weight) : null,
      glb_preview_url: imgUrl ?? (isEditing ? editDesign.glb_preview_url : null),
      manufacturer_name: mfgName.trim() || null,
      manufacturer_address: mfgAddress.trim() || null,
      manufacturer_city: mfgCity.trim() || null,
      manufacturer_atu: mfgAtu.trim() || null,
      manufacturer_contact: mfgContact.trim() || null,
    };

    if (isEditing) {
      update.mutate({ id: editDesign.id, ...input }, { onSuccess });
    } else {
      create.mutate(input, {
        onSuccess: () => {
          setName(""); setImagePreview(null); setImageFile(null);
          setCollectionId(""); setSize(""); setConstructionType("full_frame");
          setSerialPrefix(""); setFixedGtin("");
          setLensWidth(""); setBridgeWidth(""); setTempleLength(""); setWeight("");
          setUdiDiBase(""); setMfgName(""); setMfgAddress(""); setMfgCity("");
          setMfgAtu(""); setMfgContact("");
          onSuccess?.();
        },
      });
    }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unbekannter Fehler";
      toast({ title: "Fehler beim Speichern", description: message, variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{isEditing ? "Free Design bearbeiten" : "Neues Free Design"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Image */}
        <div className="space-y-2">
          <Label>Vorschau-Bild</Label>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center justify-center w-full h-32 rounded-lg border-2 border-dashed border-border hover:border-primary/50 transition-colors bg-muted/30 overflow-hidden"
          >
            {imagePreview ? (
              <img src={imagePreview} alt="Vorschau" className="h-full w-full object-contain" />
            ) : (
              <div className="flex flex-col items-center gap-1 text-muted-foreground">
                <ImagePlus className="h-6 w-6" />
                <span className="text-xs">Bild hochladen</span>
              </div>
            )}
          </button>
        </div>

        {/* Name & UDI */}
        <div className="space-y-2">
          <Label>Design-Name *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Basic UDI-DI *</Label>
          <Input value={udiDiBase} onChange={(e) => setUdiDiBase(e.target.value)} />
        </div>

        {/* Collection & Size */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Kollektion</Label>
            <Select value={collectionId} onValueChange={setCollectionId}>
              <SelectTrigger><SelectValue placeholder="Wählen…" /></SelectTrigger>
              <SelectContent>
                {collections.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Größe</Label>
            <Input placeholder="z.B. 50-18-140" value={size} onChange={(e) => setSize(e.target.value)} />
          </div>
        </div>

        {/* Construction Type */}
        <div className="space-y-2">
          <Label>Konstruktionstyp</Label>
          <Select value={constructionType} onValueChange={setConstructionType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="full_frame">Full Frame</SelectItem>
              <SelectItem value="combo_frame">Combo Frame</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Serial & GTIN */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Serial-Präfix</Label>
            <Input value={serialPrefix} onChange={(e) => setSerialPrefix(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Feste GTIN</Label>
            <Input value={fixedGtin} onChange={(e) => setFixedGtin(e.target.value)} />
          </div>
        </div>

        {/* Dimensions */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Glasbreite (mm)</Label>
            <Input type="number" min="0" step="0.1" value={lensWidth} onChange={(e) => setLensWidth(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Stegbreite (mm)</Label>
            <Input type="number" min="0" step="0.1" value={bridgeWidth} onChange={(e) => setBridgeWidth(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Bügellänge (mm)</Label>
            <Input type="number" min="0" step="0.1" value={templeLength} onChange={(e) => setTempleLength(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Gewicht (g)</Label>
            <Input type="number" min="0" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} />
          </div>
        </div>

        {/* Manufacturer */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Hersteller</Label>
            <Input value={mfgName} onChange={(e) => setMfgName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Adresse</Label>
            <Input value={mfgAddress} onChange={(e) => setMfgAddress(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Stadt</Label>
            <Input value={mfgCity} onChange={(e) => setMfgCity(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">UID-Nummer</Label>
            <Input value={mfgAtu} onChange={(e) => setMfgAtu(e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Kontaktperson</Label>
          <Input value={mfgContact} onChange={(e) => setMfgContact(e.target.value)} />
        </div>

        <Button className="w-full" disabled={!name.trim() || !udiDiBase.trim() || isPending} onClick={handleSubmit}>
          {isPending ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Wird gespeichert…</>
          ) : isEditing ? "Änderungen speichern" : "Design anlegen"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default FreeDesignForm;
