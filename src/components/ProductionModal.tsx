import { useEffect, useRef, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn, getErrorMessage } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useCustomerSession } from "@/hooks/useCustomerSession";
import { useMaterials } from "@/hooks/useMaterials";
import { useOrgColors } from "@/hooks/useOrgColors";
import { useOrganization } from "@/hooks/useOrganization";
import { useOrgDesigns } from "@/hooks/useOrgDesigns";
import type { StartProductionResult, OrgSettings } from "@/lib/types";
import { parseOrgSettings } from "@/lib/types";
import { truncate } from "@/lib/sanitize";

export interface ProductionSuccessResult {
  logId: string;
  mode: string;
  designName: string;
  udiPi: string;
  fullGs1: string | null;
  orgName?: string;
  contactPerson?: string;
  orgAddress?: string;
}

interface ProductionModalProps {
  open: boolean;
  onClose: () => void;
  designId: string;
  designName: string;
  preselectedColor?: string;
  /** For org_designs: pass UDI-DI base directly instead of looking up from designs table */
  udiDiBase?: string;
  /** Called after successful production — parent renders follow-up dialogs */
  onSuccess?: (result: ProductionSuccessResult) => void;
}

const ProductionModal = ({ open, onClose, designId, designName, preselectedColor, udiDiBase, onSuccess }: ProductionModalProps) => {
  const [color, setColor] = useState(preselectedColor ?? "");
  const [materialId, setMaterialId] = useState("");
  const [mode, setMode] = useState<"optical" | "optical_sun" | "sunglasses" | "">("");
  const [customerRef, setCustomerRef] = useState("");
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const queryClient = useQueryClient();
  const { active: sessionActive, customerName: sessionCustomer } = useCustomerSession();
  const { data: materials } = useMaterials();
  const { data: orgColors } = useOrgColors();
  const { data: org } = useOrganization();
  const { data: orgDesigns } = useOrgDesigns();
  const settings = parseOrgSettings(org?.settings);

  const isFreeDesign = orgDesigns != null && !orgDesigns.some((d) => d.id === designId);
  const [freeDesignMfr, setFreeDesignMfr] = useState<{
    manufacturer_name?: string | null;
    manufacturer_address?: string | null;
    manufacturer_city?: string | null;
    manufacturer_contact?: string | null;
  } | null>(null);
  const [freeDesignMfrLoading, setFreeDesignMfrLoading] = useState(false);

  useEffect(() => {
    if (!(open && isFreeDesign && designId)) {
      setFreeDesignMfr(null);
      setFreeDesignMfrLoading(false);
      return;
    }
    let cancelled = false;
    setFreeDesignMfrLoading(true);
    (async () => {
      try {
        const { data: d } = await supabase
          .from("designs")
          .select("manufacturer_name, manufacturer_address, manufacturer_city, manufacturer_contact")
          .eq("id", designId)
          .maybeSingle();
        if (!cancelled) {
          setFreeDesignMfr(d ?? null);
          setFreeDesignMfrLoading(false);
        }
      } catch {
        if (!cancelled) {
          setFreeDesignMfr(null);
          setFreeDesignMfrLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [open, isFreeDesign, designId]);

  useEffect(() => {
    if (open) {
      if (preselectedColor) setColor(preselectedColor);
      if (sessionActive && sessionCustomer) setCustomerRef(sessionCustomer);
    }
  }, [open, preselectedColor, sessionActive, sessionCustomer]);

  const handleClose = () => {
    setShowConfirm(false);
    setColor(preselectedColor ?? "");
    setMode("");
    setMaterialId("");
    setCustomerRef("");
    onClose();
  };

  const submittingRef = useRef(false);
  const handleStart = async () => {
    if (!mode || !designId || submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("start_production", {
        p_design_id: designId || null,
        p_mode: mode,
        p_customer_ref: customerRef.trim() || null,
        p_color: color || null,
        p_material_id: materialId || null,
        p_udi_di_base: udiDiBase || null,
      });

      if (error) throw error;

      const result = data as unknown as StartProductionResult;
      queryClient.invalidateQueries({ queryKey: ["organization"] });
      queryClient.invalidateQueries({ queryKey: ["production_logs_all"] });
      queryClient.invalidateQueries({ queryKey: ["production_logs"] });
      queryClient.invalidateQueries({ queryKey: ["last_print"] });
      queryClient.invalidateQueries({ queryKey: ["gtin-pool-count"] });

      // Capture mode before resetting state
      const currentMode = mode;

      // Reset local state
      setColor("");
      setMode("");
      setMaterialId("");
      setCustomerRef("");
      setShowConfirm(false);

      // Notify parent with result — use manufacturer from designs table for Free Designs
      // Fallback to org data if Free Design manufacturer data is not available
      const mfrName = isFreeDesign ? (freeDesignMfr?.manufacturer_name || org?.name) : org?.name;
      const mfrContact = isFreeDesign
        ? (freeDesignMfr?.manufacturer_contact || settings.mdr_responsible_person || settings.contact_person)
        : (settings.mdr_responsible_person || settings.contact_person);
      const mfrAddress = isFreeDesign
        ? [freeDesignMfr?.manufacturer_address, freeDesignMfr?.manufacturer_city].filter(Boolean).join(", ") || settings.address
        : settings.address;

      onSuccess?.({
        logId: result.log_id,
        mode: currentMode,
        designName,
        udiPi: result.udi_pi,
        fullGs1: result.full_gs1,
        orgName: mfrName ?? undefined,
        contactPerson: mfrContact ?? undefined,
        orgAddress: mfrAddress ?? undefined,
      });

      // Close dialog (unmounts component)
      onClose();
    } catch (err: unknown) {
      toast({ title: "Fehler", description: getErrorMessage(err), variant: "destructive" });
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };

  const getConfirmText = () => {
    const colorName = orgColors?.find((c) => c.id === color)?.name ?? color;
    const colorText = colorName ? ` in ${colorName}` : "";
    const gtinHint = udiDiBase ? "Die feste Design-GTIN wird verwendet." : "Eine GTIN wird aus dem Pool zugewiesen.";
    if (mode === "optical")
      return `Optische Brille „${designName}"${colorText} wird angelegt. ${gtinHint} Fortfahren?`;
    if (mode === "optical_sun")
      return `Optische Sonnenbrille „${designName}"${colorText} wird angelegt. ${gtinHint} Fortfahren?`;
    return `Sonnenbrille (PSA) „${designName}"${colorText} wird angelegt. ${gtinHint} Fortfahren?`;
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rahmen anlegen</DialogTitle>
          <DialogDescription>{designName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Material */}
          <div className="space-y-2">
            <Label>Material wählen</Label>
            <Select value={materialId} onValueChange={setMaterialId}>
              <SelectTrigger>
                <SelectValue placeholder="Material auswählen" />
              </SelectTrigger>
              <SelectContent>
                {materials?.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
                {(!materials || materials.length === 0) && (
                  <SelectItem value="__none" disabled>Keine Materialien angelegt</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Farbe */}
          <div className="space-y-2">
            <Label>Farbe wählen</Label>
            <Select value={color} onValueChange={setColor}>
              <SelectTrigger>
                <SelectValue placeholder="Farbe auswählen" />
              </SelectTrigger>
              <SelectContent>
                {orgColors?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} {c.color_type === "custom_mix" ? "(C1)" : ""}
                  </SelectItem>
                ))}
                {(!orgColors || orgColors.length === 0) && (
                  <SelectItem value="__none" disabled>Keine Farben angelegt — Farbkatalog besuchen</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Modus */}
          <div className="space-y-2">
            <Label>Modus wählen</Label>
            <div className="grid grid-cols-3 gap-3">
              <Button
                type="button"
                variant={mode === "optical" ? "default" : "outline"}
                className={cn("h-auto py-3", mode === "optical" && "ring-2 ring-neon-cyan ring-offset-2 ring-offset-background")}
                onClick={() => setMode("optical")}
              >
                <div className="text-center">
                  <div className="font-medium text-sm">Optisch</div>
                  <div className="text-xs opacity-70 mt-0.5">nur MDR</div>
                </div>
              </Button>
              <Button
                type="button"
                variant={mode === "optical_sun" ? "default" : "outline"}
                className={cn("h-auto py-3", mode === "optical_sun" && "ring-2 ring-warning ring-offset-2 ring-offset-background")}
                onClick={() => setMode("optical_sun")}
              >
                <div className="text-center">
                  <div className="font-medium text-sm">Opt. Sonne</div>
                  <div className="text-xs opacity-70 mt-0.5">MDR + PSA</div>
                </div>
              </Button>
              <Button
                type="button"
                variant={mode === "sunglasses" ? "default" : "outline"}
                className={cn("h-auto py-3", mode === "sunglasses" && "ring-2 ring-neon-pink ring-offset-2 ring-offset-background")}
                onClick={() => setMode("sunglasses")}
              >
                <div className="text-center">
                  <div className="font-medium text-sm">Sonnenbrille</div>
                  <div className="text-xs opacity-70 mt-0.5">nur PSA</div>
                </div>
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customerRef">Kundenreferenz</Label>
            <Input
              id="customerRef"
              placeholder="z.B. Bestellung #12345"
              value={customerRef}
              onChange={(e) => setCustomerRef(truncate(e.target.value, 100))}
              maxLength={100}
              aria-describedby="customerRef-help"
            />
            <p id="customerRef-help" className="text-xs text-muted-foreground">
              Optional. Max. 100 Zeichen. Wird für die Nachverfolgung verwendet.
            </p>
          </div>
        </div>

        <DialogFooter>
          {showConfirm ? (
            <div className="w-full space-y-3">
              <div className="rounded-md border border-warning/30 bg-warning/5 p-3 text-sm text-foreground space-y-2">
                <p>{getConfirmText()}</p>
                <p className="text-xs text-muted-foreground">
                  Status: QC ausstehend — Qualitätskontrolle nach Druck erforderlich.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowConfirm(false)}>Abbrechen</Button>
                <Button disabled={loading} onClick={handleStart}>
                  {loading ? "Wird angelegt…" : "Bestätigen"}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose}>Abbrechen</Button>
              <Button
                disabled={!color || !mode || !materialId || (isFreeDesign && freeDesignMfrLoading)}
                onClick={() => setShowConfirm(true)}
              >
                {isFreeDesign && freeDesignMfrLoading ? "Lade…" : "Rahmen anlegen"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProductionModal;
