import { useState, useRef, useCallback, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

interface ColorPickerPanelProps {
  hex: string;
  onChange: (hex: string) => void;
}

/* ── helpers ── */
function hsvToHex(h: number, s: number, v: number): string {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(Math.min(k, 4 - k, 1), 0);
  };
  const toHex = (x: number) =>
    Math.round(x * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(f(5))}${toHex(f(3))}${toHex(f(1))}`;
}

function hexToHsv(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d + 6) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return [h, max === 0 ? 0 : d / max, max];
}

function isValidHex(v: string) {
  return /^#[0-9a-fA-F]{6}$/.test(v);
}

const ColorPickerPanel = ({ hex, onChange }: ColorPickerPanelProps) => {
  const safeHex = isValidHex(hex) ? hex : "#ff0000";
  const [hsv, setHsv] = useState<[number, number, number]>(() => hexToHsv(safeHex));
  const [hexInput, setHexInput] = useState(safeHex);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragging = useRef(false);

  // sync external hex → internal state
  useEffect(() => {
    if (isValidHex(hex) && hex.toLowerCase() !== hsvToHex(...hsv).toLowerCase()) {
      const newHsv = hexToHsv(hex);
      setHsv(newHsv);
      setHexInput(hex);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hex]);

  const emit = useCallback(
    (h: number, s: number, v: number) => {
      const newHex = hsvToHex(h, s, v);
      setHsv([h, s, v]);
      setHexInput(newHex);
      onChange(newHex);
    },
    [onChange]
  );

  /* ── draw gradient canvas ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    // white → hue
    const hGrad = ctx.createLinearGradient(0, 0, w, 0);
    hGrad.addColorStop(0, "#fff");
    hGrad.addColorStop(1, hsvToHex(hsv[0], 1, 1));
    ctx.fillStyle = hGrad;
    ctx.fillRect(0, 0, w, h);
    // transparent → black
    const vGrad = ctx.createLinearGradient(0, 0, 0, h);
    vGrad.addColorStop(0, "rgba(0,0,0,0)");
    vGrad.addColorStop(1, "#000");
    ctx.fillStyle = vGrad;
    ctx.fillRect(0, 0, w, h);
  }, [hsv[0]]);

  const pickFromCanvas = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const s = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const v = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));
      emit(hsv[0], s, v);
    },
    [hsv[0], emit]
  );

  useEffect(() => {
    const onMove = (e: MouseEvent) => dragging.current && pickFromCanvas(e);
    const onUp = () => (dragging.current = false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [pickFromCanvas]);

  return (
    <div className="space-y-4">
      {/* SV gradient field */}
      <div className="relative rounded-lg overflow-hidden border border-border cursor-crosshair">
        <canvas
          ref={canvasRef}
          width={280}
          height={160}
          className="w-full h-40"
          onMouseDown={(e) => {
            dragging.current = true;
            pickFromCanvas(e);
          }}
        />
        {/* selector dot */}
        <div
          className="absolute w-4 h-4 rounded-full border-2 border-white shadow-md pointer-events-none -translate-x-1/2 -translate-y-1/2"
          style={{
            left: `${hsv[1] * 100}%`,
            top: `${(1 - hsv[2]) * 100}%`,
            backgroundColor: hsvToHex(...hsv),
          }}
        />
      </div>

      {/* Hue slider */}
      <div className="space-y-1.5">
        <Label className="text-xs">Farbton</Label>
        <div
          className="h-3 rounded-full"
          style={{
            background:
              "linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)",
          }}
        />
        <Slider
          min={0}
          max={360}
          step={1}
          value={[hsv[0]]}
          onValueChange={([h]) => emit(h, hsv[1], hsv[2])}
          className="mt-1"
        />
      </div>

      {/* Hex input + preview swatch */}
      <div className="flex items-end gap-3">
        <div className="flex-1 space-y-1.5">
          <Label className="text-xs">Hex</Label>
          <Input
            value={hexInput}
            onChange={(e) => {
              setHexInput(e.target.value);
              if (isValidHex(e.target.value)) {
                const [h, s, v] = hexToHsv(e.target.value);
                emit(h, s, v);
              }
            }}
            placeholder="#FF5500"
            className="font-mono"
          />
        </div>
        <div
          className="h-10 w-10 rounded-md border border-border shrink-0"
          style={{ backgroundColor: hsvToHex(...hsv) }}
        />
      </div>
    </div>
  );
};

export default ColorPickerPanel;
