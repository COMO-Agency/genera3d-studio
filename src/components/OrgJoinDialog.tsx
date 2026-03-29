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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { KeyRound, Loader2 } from "lucide-react";
import { getErrorMessage } from "@/lib/utils";

interface OrgJoinDialogProps {
  open: boolean;
  onClose: () => void;
}

const OrgJoinDialog = ({ open, onClose }: OrgJoinDialogProps) => {
  const [licenseKey, setLicenseKey] = useState("");
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleJoin = async () => {
    if (!licenseKey.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("join_organization", {
        p_license_key: licenseKey.trim(),
      });
      if (error) throw error;
      const result = data as unknown as { success: boolean; org_id: string; org_name: string };
      toast({
        title: "Organisation beigetreten!",
        description: `Du bist jetzt Mitglied von "${result.org_name}".`,
      });
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["organization"] });
      queryClient.invalidateQueries({ queryKey: ["production_logs_all"] });
      queryClient.invalidateQueries({ queryKey: ["org_colors"] });
      queryClient.invalidateQueries({ queryKey: ["org_designs"] });
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      queryClient.invalidateQueries({ queryKey: ["label_subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
      setLicenseKey("");
      onClose();
    } catch (err: unknown) {
      toast({ title: "Fehler", description: getErrorMessage(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setLicenseKey(""); onClose(); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            Organisation beitreten
          </DialogTitle>
          <DialogDescription>
            Gib den Lizenzschlüssel deiner Organisation ein, um Zugang zu Designs, Druckern und dem GTIN-Pool zu erhalten.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="licenseKey">Lizenzschlüssel</Label>
            <Input
              id="licenseKey"
              placeholder="z.B. G3D-XXXX-XXXX-XXXX"
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
              className="font-mono"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Abbrechen</Button>
          <Button disabled={!licenseKey.trim() || loading} onClick={handleJoin}>
            {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Wird verknüpft…</> : "Beitreten"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OrgJoinDialog;
