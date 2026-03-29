import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImagePlus, Loader2 } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "@/hooks/use-toast";
import {
  useCreateOrgDesign,
  useUpdateOrgDesign,
  useUploadDesignImage,
  type CreateOrgDesignInput,
  type OrgDesign,
} from "@/hooks/useOrgDesigns";

interface Props {
  onSuccess?: () => void;
  /** If provided, form is in edit mode */
  editDesign?: OrgDesign | null;
}

const OrgDesignForm = ({ onSuccess, editDesign }: Props) => {
  const { data: profile } = useProfile();
  const createDesign = useCreateOrgDesign();
  const updateDesign = useUpdateOrgDesign();
  const uploadImage = useUploadDesignImage();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [lensWidth, setLensWidth] = useState("");
  const [bridgeWidth, setBridgeWidth] = useState("");
  const [templeLength, setTempleLength] = useState("");
  const [weight, setWeight] = useState("");
  const [udiDiBase, setUdiDiBase] = useState("");
  const [collection, setCollection] = useState("");
  const [size, setSize] = useState("");
  const [constructionType, setConstructionType] = useState("full_frame");
  const [serialPrefix, setSerialPrefix] = useState("");
  const [fixedGtin, setFixedGtin] = useState("");

  // Populate form when editDesign changes
  useEffect(() => {
    if (editDesign) {
      setName(editDesign.name);
      setImagePreview(editDesign.image_url);
      setLensWidth(editDesign.lens_width_mm?.toString() ?? "");
      setBridgeWidth(editDesign.bridge_width_mm?.toString() ?? "");
      setTempleLength(editDesign.temple_length_mm?.toString() ?? "");
      setWeight(editDesign.weight_g?.toString() ?? "");
      setUdiDiBase(editDesign.master_udi_di_base ?? "");
      setCollection(editDesign.collection ?? "");
      setSize(editDesign.size ?? "");
      setConstructionType(editDesign.construction_type ?? "full_frame");
      setSerialPrefix(editDesign.serial_prefix ?? "");
      setFixedGtin(editDesign.fixed_gtin ?? "");
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

  const isPending =
    createDesign.isPending || updateDesign.isPending || uploadImage.isPending;
  const isEditing = !!editDesign;

  const handleSubmit = async () => {
    // Early exit if already processing
    if (isPending) return;
    if (!name.trim() || !profile?.org_id) return;

    let imageUrl: string | undefined;
    try {
      if (imageFile) {
        imageUrl = await uploadImage.mutateAsync({
          file: imageFile,
          orgId: profile.org_id,
        });
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Bild-Upload fehlgeschlagen";
      toast({
        title: "Upload-Fehler",
        description: message,
        variant: "destructive",
      });
      return;
    }

    const input: CreateOrgDesignInput = {
      name: name.trim(),
      image_url:
        imageUrl ??
        (isEditing ? (editDesign.image_url ?? undefined) : undefined),
      lens_width_mm:
        lensWidth.trim() && !isNaN(parseFloat(lensWidth))
          ? parseFloat(lensWidth)
          : undefined,
      bridge_width_mm:
        bridgeWidth.trim() && !isNaN(parseFloat(bridgeWidth))
          ? parseFloat(bridgeWidth)
          : undefined,
      temple_length_mm:
        templeLength.trim() && !isNaN(parseFloat(templeLength))
          ? parseFloat(templeLength)
          : undefined,
      weight_g:
        weight.trim() && !isNaN(parseFloat(weight))
          ? parseFloat(weight)
          : undefined,
      master_udi_di_base: udiDiBase.trim() || undefined,
      collection: collection.trim() || undefined,
      size: size || undefined,
      construction_type: constructionType || undefined,
      serial_prefix: serialPrefix.trim() || undefined,
      fixed_gtin: fixedGtin.trim() || undefined,
    };

    if (isEditing) {
      updateDesign.mutate({ id: editDesign.id, ...input }, { onSuccess });
    } else {
      createDesign.mutate(input, {
        onSuccess: () => {
          setName("");
          setImagePreview(null);
          setImageFile(null);
          setLensWidth("");
          setBridgeWidth("");
          setTempleLength("");
          setWeight("");
          setUdiDiBase("");
          setCollection("");
          setSize("");
          setConstructionType("full_frame");
          setSerialPrefix("");
          setFixedGtin("");
          onSuccess?.();
        },
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {isEditing ? "Design bearbeiten" : "Neues Design anlegen"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Image upload */}
        <div className="space-y-2">
          <Label>Vorschau-Bild</Label>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center justify-center w-full h-32 rounded-lg border-2 border-dashed border-border hover:border-primary/50 transition-colors bg-muted/30 overflow-hidden"
          >
            {imagePreview ? (
              <img
                src={imagePreview}
                alt="Vorschau"
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="flex flex-col items-center gap-1 text-muted-foreground">
                <ImagePlus className="h-6 w-6" />
                <span className="text-xs">Bild hochladen</span>
              </div>
            )}
          </button>
        </div>

        {/* Name */}
        <div className="space-y-2">
          <Label>Design-Name *</Label>
          <Input
            placeholder="Design-Name eingeben"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* Collection & Size */}
        <div>
          <Label className="text-sm font-medium">Kollektion & Größe</Label>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="space-y-1">
              <Label className="text-xs">Kollektion</Label>
              <Input
                placeholder=""
                value={collection}
                onChange={(e) => setCollection(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Größe</Label>
              <Input
                placeholder="z.B. 50-18-140"
                value={size}
                onChange={(e) => setSize(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Construction Type */}
        <div className="space-y-2">
          <Label>Konstruktionstyp</Label>
          <Select value={constructionType} onValueChange={setConstructionType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="full_frame">
                Full Frame (Front + Bügel Kunststoff)
              </SelectItem>
              <SelectItem value="combo_frame">
                Combo Frame (Front Kunststoff + Bügel Metall)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Serial Prefix & GTIN */}
        <div>
          <Label className="text-sm font-medium">
            Produktion & Identifikation
          </Label>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="space-y-1">
              <Label className="text-xs">Serial-Präfix</Label>
              <Input
                placeholder=""
                value={serialPrefix}
                onChange={(e) => setSerialPrefix(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground">
                Wird für die Seriennummer verwendet
              </p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Feste GTIN</Label>
              <Input
                placeholder=""
                value={fixedGtin}
                onChange={(e) => setFixedGtin(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground">
                13-stellige GTIN für dieses Design
              </p>
            </div>
          </div>
        </div>

        {/* Dimensions */}
        <div>
          <Label className="text-sm font-medium">Kastenmaß</Label>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="space-y-1">
              <Label className="text-xs">Glasbreite (mm)</Label>
              <Input
                type="number"
                min="0"
                step="0.1"
                value={lensWidth}
                onChange={(e) => setLensWidth(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Stegbreite (mm)</Label>
              <Input
                type="number"
                min="0"
                step="0.1"
                value={bridgeWidth}
                onChange={(e) => setBridgeWidth(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Bügellänge (mm)</Label>
              <Input
                type="number"
                min="0"
                step="0.1"
                value={templeLength}
                onChange={(e) => setTempleLength(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Gewicht (g)</Label>
              <Input
                type="number"
                min="0"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* UDI-DI */}
        <div className="space-y-2">
          <Label>Basic UDI-DI</Label>
          <Input
            placeholder=""
            value={udiDiBase}
            onChange={(e) => setUdiDiBase(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Wird automatisch anhand des Konstruktionstyps bestimmt, kann aber
            überschrieben werden.
          </p>
        </div>

        {/* Hinweis: Herstellerdaten kommen aus den Organisationseinstellungen */}
        <p className="text-xs text-muted-foreground">
          Herstellerdaten werden aus den Organisationseinstellungen übernommen.
        </p>

        <Button
          className="w-full"
          disabled={!name.trim() || isPending}
          onClick={handleSubmit}
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Wird
              gespeichert…
            </>
          ) : isEditing ? (
            "Änderungen speichern"
          ) : (
            "Design anlegen"
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default OrgDesignForm;
