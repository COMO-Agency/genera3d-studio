import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ColorPickerPanel from "./ColorPickerPanel";
import CmykIndicator from "@/components/CmykIndicator";
import { useCreateOrgColor, type CreateColorInput } from "@/hooks/useOrgColors";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const CreateColorDialog = ({ open, onOpenChange }: Props) => {
  const createColor = useCreateOrgColor();

  const [colorType, setColorType] = useState<"standard" | "custom_mix">(
    "standard",
  );
  const [name, setName] = useState("");
  const [colorCode, setColorCode] = useState("");
  const [hexPreview, setHexPreview] = useState("#3b82f6");
  const [opacityType, setOpacityType] = useState<
    "opak" | "transparent" | "transluzent"
  >("opak");

  // optional CMYK fields for custom_mix
  const [cyan, setCyan] = useState("");
  const [magenta, setMagenta] = useState("");
  const [yellow, setYellow] = useState("");
  const [black, setBlack] = useState("");
  const [white, setWhite] = useState("");
  const cmykSum = [cyan, magenta, yellow, black, white].reduce(
    (s, v) => s + (parseFloat(v) || 0),
    0,
  );
  const naturalPct = Math.max(0, 100 - cmykSum);
  const [showCmyk, setShowCmyk] = useState(false);

  const reset = () => {
    setName("");
    setColorCode("");
    setHexPreview("#3b82f6");
    setOpacityType("opak");
    setColorType("standard");
    setCyan("");
    setMagenta("");
    setYellow("");
    setBlack("");
    setWhite("");
    setShowCmyk(false);
  };

  const handleCreate = () => {
    const input: CreateColorInput = {
      name: name.trim(),
      color_type: colorType,
      hex_preview: hexPreview,
      opacity_type: opacityType,
    };
    if (colorType === "standard") {
      input.color_code = colorCode.trim();
    } else {
      if (showCmyk) {
        input.cyan = parseFloat(cyan) || 0;
        input.magenta = parseFloat(magenta) || 0;
        input.yellow = parseFloat(yellow) || 0;
        input.black = parseFloat(black) || 0;
        input.white = parseFloat(white) || 0;
        input.natural_pct = naturalPct;
      }
    }
    createColor.mutate(input, {
      onSuccess: () => {
        reset();
        onOpenChange(false);
      },
    });
  };

  const cmykAllValid = [cyan, magenta, yellow, black, white].every((v) => {
    const n = parseFloat(v) || 0;
    return n >= 0;
  });
  const valid =
    name.trim().length > 0 &&
    (colorType === "standard" ? colorCode.trim().length > 0 : true) &&
    (!showCmyk || (cmykSum <= 100 && cmykAllValid));

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Neue Farbe anlegen</DialogTitle>
          <DialogDescription>
            Standardfarbe von Kartusche oder C1-Sonderfarbe mit Color Picker.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Type */}
          <div className="space-y-2">
            <Label>Typ</Label>
            <Select
              value={colorType}
              onValueChange={(v) =>
                setColorType(v as "standard" | "custom_mix")
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">
                  Standardfarbe (Kartusche)
                </SelectItem>
                <SelectItem value="custom_mix">
                  Sonderfarbe (C1 selbst gemischt)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label>Name der Farbe</Label>
            <Input
              placeholder="z.B. Mitternachtsblau"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {colorType === "standard" ? (
            <>
              <div className="space-y-2">
                <Label>Color Code (Kartusche)</Label>
                <Input
                  placeholder="z.B. BK-001"
                  value={colorCode}
                  onChange={(e) => setColorCode(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Farbvorschau (Hex)</Label>
                <div className="flex items-center gap-3">
                  <Input
                    placeholder="#000000"
                    value={hexPreview}
                    onChange={(e) => setHexPreview(e.target.value)}
                    className="font-mono flex-1"
                  />
                  <div
                    className="h-10 w-10 rounded-md border border-border shrink-0"
                    style={{
                      backgroundColor: /^#[0-9a-fA-F]{6}$/.test(hexPreview)
                        ? hexPreview
                        : "transparent",
                    }}
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Color Picker */}
              <ColorPickerPanel hex={hexPreview} onChange={setHexPreview} />

              {/* Opacity type */}
              <div className="space-y-2">
                <Label>Materialart</Label>
                <Select
                  value={opacityType}
                  onValueChange={(v) =>
                    setOpacityType(v as "opak" | "transparent" | "transluzent")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="opak">Opak</SelectItem>
                    <SelectItem value="transluzent">Transluzent</SelectItem>
                    <SelectItem value="transparent">Transparent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Optional CMYK */}
              <div>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors underline"
                  onClick={() => setShowCmyk(!showCmyk)}
                >
                  {showCmyk
                    ? "CMYKW-Werte ausblenden"
                    : "Optionale CMYKW-Werte eingeben"}
                </button>

                {showCmyk && (
                  <div className="mt-3 space-y-3">
                    <p className="text-xs text-muted-foreground">
                      CMYKW-Anteile in % — Natural wird als Rest berechnet.
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: "Cyan %", val: cyan, set: setCyan },
                        { label: "Magenta %", val: magenta, set: setMagenta },
                        { label: "Yellow %", val: yellow, set: setYellow },
                        { label: "Black %", val: black, set: setBlack },
                        { label: "White %", val: white, set: setWhite },
                      ].map(({ label, val, set }) => (
                        <div key={label} className="space-y-1">
                          <Label className="text-xs">{label}</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={val}
                            onChange={(e) => set(e.target.value)}
                          />
                        </div>
                      ))}
                      <div className="space-y-1">
                        <Label className="text-xs">Natural %</Label>
                        <Input
                          type="number"
                          disabled
                          value={naturalPct.toFixed(1)}
                          className="bg-muted"
                        />
                      </div>
                    </div>
                    {cmykSum > 100 && (
                      <p className="text-xs text-destructive">
                        Summe übersteigt 100% ({cmykSum.toFixed(1)}%)
                      </p>
                    )}
                    <CmykIndicator
                      cyan={parseFloat(cyan) || 0}
                      magenta={parseFloat(magenta) || 0}
                      yellow={parseFloat(yellow) || 0}
                      black={parseFloat(black) || 0}
                      white={parseFloat(white) || 0}
                      natural={naturalPct}
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              reset();
              onOpenChange(false);
            }}
          >
            Abbrechen
          </Button>
          <Button
            disabled={!valid || createColor.isPending}
            onClick={handleCreate}
          >
            {createColor.isPending ? "Wird gespeichert…" : "Farbe anlegen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateColorDialog;
