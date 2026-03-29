import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { qcChecklistItems } from "@/lib/constants";
import { getErrorMessage } from "@/lib/utils";

interface QcCheckDialogProps {
  open: boolean;
  onClose: () => void;
  logId: string;
  designName: string;
}

const QcCheckDialog = ({
  open,
  onClose,
  logId,
  designName,
}: QcCheckDialogProps) => {
  const [checked, setChecked] = useState<boolean[]>(
    qcChecklistItems.map(() => false),
  );
  const [surfaceTreated, setSurfaceTreated] = useState(false);
  const [surfaceMethod, setSurfaceMethod] = useState<
    "gleitgeschliffen" | "poliert" | ""
  >("");
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  // Reset state when dialog opens to prevent state bleed between sessions
  useEffect(() => {
    if (open) {
      setChecked(qcChecklistItems.map(() => false));
      setSurfaceTreated(false);
      setSurfaceMethod("");
    }
  }, [open, logId]);

  const allChecked = checked.every(Boolean);

  const handleToggle = (index: number) => {
    setChecked((prev) => prev.map((v, i) => (i === index ? !v : v)));
  };

  const handleSubmit = async (passed: boolean) => {
    setLoading(true);
    try {
      const items = [
        ...qcChecklistItems.map((label, i) => ({ label, checked: checked[i] })),
        {
          label: "Oberflächenbehandlung",
          checked: surfaceTreated,
          ...(surfaceTreated && surfaceMethod ? { method: surfaceMethod } : {}),
        },
      ];

      const { error } = await supabase.rpc("complete_qc_check", {
        p_production_log_id: logId,
        p_checklist_items: items,
        p_passed: passed,
      });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["production_logs_all"] });
      queryClient.invalidateQueries({ queryKey: ["production_logs"] });
      toast({
        title: passed ? "QC bestanden" : "QC fehlgeschlagen",
        description: passed
          ? "Brille hat die Qualitätskontrolle bestanden."
          : "Brille hat die QC nicht bestanden.",
        variant: passed ? "default" : "destructive",
      });
      setChecked(qcChecklistItems.map(() => false));
      setSurfaceTreated(false);
      setSurfaceMethod("");
      onClose();
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

  const handleClose = () => {
    setChecked(qcChecklistItems.map(() => false));
    setSurfaceTreated(false);
    setSurfaceMethod("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Qualitätskontrolle</DialogTitle>
          <DialogDescription>
            {designName} — alle Punkte prüfen
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {qcChecklistItems.map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <Checkbox
                id={`qc-${i}`}
                checked={checked[i]}
                onCheckedChange={() => handleToggle(i)}
              />
              <Label
                htmlFor={`qc-${i}`}
                className="text-sm text-foreground cursor-pointer leading-tight"
              >
                {item}
              </Label>
            </div>
          ))}

          <Separator className="my-3" />

          {/* Nachbearbeitung */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                Oberflächenbehandlung durchgeführt?
              </Label>
              <Switch
                checked={surfaceTreated}
                onCheckedChange={setSurfaceTreated}
              />
            </div>

            {surfaceTreated && (
              <RadioGroup
                value={surfaceMethod}
                onValueChange={(v) =>
                  setSurfaceMethod(v as "gleitgeschliffen" | "poliert")
                }
                className="pl-2 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem
                    value="gleitgeschliffen"
                    id="qc-surface-gleit"
                  />
                  <Label
                    htmlFor="qc-surface-gleit"
                    className="text-sm cursor-pointer"
                  >
                    Gleitgeschliffen
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="poliert" id="qc-surface-poliert" />
                  <Label
                    htmlFor="qc-surface-poliert"
                    className="text-sm cursor-pointer"
                  >
                    Poliert
                  </Label>
                </div>
              </RadioGroup>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="destructive"
            className="gap-2"
            disabled={!checked.some(Boolean) || loading}
            onClick={() => handleSubmit(false)}
          >
            <XCircle className="h-4 w-4" /> Nicht bestanden
          </Button>
          <Button
            className="gap-2"
            disabled={
              !allChecked || (surfaceTreated && !surfaceMethod) || loading
            }
            onClick={() => handleSubmit(true)}
          >
            <CheckCircle2 className="h-4 w-4" /> Bestanden
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default QcCheckDialog;
