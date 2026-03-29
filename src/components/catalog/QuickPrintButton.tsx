import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { modeLabelMap } from "@/lib/constants";
import { getErrorMessage } from "@/lib/utils";
import type { LastPrint } from "@/hooks/useLastPrint";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface QuickPrintButtonProps {
  lastPrint: LastPrint;
}

const QuickPrintButton = ({ lastPrint }: QuickPrintButtonProps) => {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleQuickPrint = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc("start_production", {
        p_design_id: lastPrint.design_id,
        p_mode: lastPrint.mode ?? "optical",
        p_customer_ref: lastPrint.customer_ref ?? undefined,
        p_color: lastPrint.color ?? undefined,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["organization"] });
      queryClient.invalidateQueries({ queryKey: ["production_logs"] });
      queryClient.invalidateQueries({ queryKey: ["production_logs_all"] });
      queryClient.invalidateQueries({ queryKey: ["last_print"] });
      queryClient.invalidateQueries({ queryKey: ["gtin-pool-count"] });
      toast({
        title: "Express-Druck gestartet",
        description: `${lastPrint.design_name} wird gedruckt.`,
      });
    } catch (err: unknown) {
      toast({
        title: "Fehler",
        description: getErrorMessage(err),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setConfirmOpen(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="group gap-2 border-primary/30 hover:border-primary/60 neon-glow"
        onClick={() => setConfirmOpen(true)}
      >
        <Zap className="h-3.5 w-3.5 text-primary group-hover:animate-pulse" />
        <span className="hidden sm:inline">Wiederholen:</span>
        <span className="font-medium">{lastPrint.design_name}</span>
        {(lastPrint.color_name || lastPrint.color) && (
          <Badge variant="secondary" className="text-[10px] px-1.5">
            {lastPrint.color_name ?? lastPrint.color}
          </Badge>
        )}
      </Button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Express-Druck wiederholen?</AlertDialogTitle>
            <AlertDialogDescription>
              {lastPrint.design_name}
              {lastPrint.color
                ? ` in ${lastPrint.color_name ?? lastPrint.color}`
                : ""}
              {lastPrint.mode
                ? ` · ${modeLabelMap[lastPrint.mode] ?? lastPrint.mode}`
                : ""}
              {lastPrint.customer_ref ? ` · ${lastPrint.customer_ref}` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleQuickPrint} disabled={loading}>
              {loading ? "Wird gestartet…" : "Jetzt drucken"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default QuickPrintButton;
