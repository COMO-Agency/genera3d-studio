import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useProfile } from "@/hooks/useProfile";
import { generateCertificatePdf } from "@/lib/generateCertificatePdf";
import { parseOrgSettings } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, ShieldCheck, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/utils";

interface DesignOption {
  id: string;
  name: string;
  master_udi_di_base: string;
  version: number | null;
  construction_type?: string | null;
  collection?: string | null;
  size?: string | null;
  serial_prefix?: string | null;
}

interface CertificateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-selected design (skips dropdown) */
  design?: DesignOption | null;
  /** Pre-fill color from production log */
  defaultColor?: string;
}

const CertificateDialog = ({
  open,
  onOpenChange,
  design: preselected,
  defaultColor,
}: CertificateDialogProps) => {
  const [selectedId, setSelectedId] = useState<string>("");
  const [color, setColor] = useState("");
  const [certDate, setCertDate] = useState("");
  const [generating, setGenerating] = useState(false);
  const { data: org } = useOrganization();
  const { data: profile } = useProfile();

  useEffect(() => {
    if (open) {
      setCertDate(new Date().toISOString().split("T")[0]);
      setColor(defaultColor ?? "");
      if (!preselected) setSelectedId("");
    }
  }, [defaultColor, open, preselected]);

  const orgId = profile?.org_id;
  const { data: designs } = useQuery({
    queryKey: ["designs-for-certificate", orgId],
    enabled: open && !preselected && !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("org_designs")
        .select(
          "id, name, master_udi_di_base, construction_type, collection, size, serial_prefix",
        )
        .eq("is_active", true)
        .eq("org_id", orgId as string)
        .order("name");
      if (error) throw error;
      return (data ?? []).map((d) => ({
        ...d,
        version: 1 as number | null,
      })) as DesignOption[];
    },
  });

  const chosen =
    preselected ?? designs?.find((d) => d.id === selectedId) ?? null;
  const settings = parseOrgSettings(org?.settings);
  const isCombo = chosen?.construction_type === "combo_frame";
  const udiDi = chosen?.master_udi_di_base || null;

  const handleGenerate = async () => {
    if (!chosen || !org) {
      toast({
        title: "Fehler",
        description: "Design und Organisation müssen verfügbar sein.",
        variant: "destructive",
      });
      return;
    }
    setGenerating(true);
    try {
      const modelName = chosen.name + (chosen.size ? ` ${chosen.size}` : "");
      await generateCertificatePdf({
        orgName: org.name,
        address: settings.address ?? "",
        atuNumber: settings.atu_number ?? "",
        contactPerson: settings.contact_person ?? "",
        city: settings.city ?? "",
        designName: chosen.name,
        version: chosen.version ?? 1,
        masterUdiDiBase: udiDi ?? "",
        modelName,
        color: color.trim() || undefined,
        constructionType:
          (chosen.construction_type as "full_frame" | "combo_frame") ||
          "full_frame",
        mdrResponsiblePerson: settings.mdr_responsible_person ?? undefined,
        ceoName: settings.ceo_name ?? undefined,
        srn: settings.srn ?? undefined,
        signatureUrl: settings.signature_url ?? undefined,
        mdrSignatureUrl: settings.mdr_signature_url ?? undefined,
        logoUrl: settings.logo_url ?? undefined,
        certificateDate: certDate ? new Date(certDate) : undefined,
      });
      toast({
        title: "PDF erstellt",
        description: `Konformitätserklärung für ${chosen.name} wurde heruntergeladen.`,
      });
    } catch (err: unknown) {
      toast({
        title: "Fehler",
        description: getErrorMessage(err),
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          setColor("");
          setSelectedId("");
          setCertDate(new Date().toISOString().split("T")[0]);
        }
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            EU-Konformitätserklärung
          </DialogTitle>
          <DialogDescription>
            Erstelle eine EU-Konformitätserklärung gemäß MDR 2017/745 für ein
            Design.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {!preselected && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-foreground">
                Design auswählen
              </Label>
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger>
                  <SelectValue placeholder="Design wählen…" />
                </SelectTrigger>
                <SelectContent>
                  {designs?.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name} — V{d.version ?? 1}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Color input */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-foreground">Farbe</Label>
            <Input
              placeholder="z.B. Schwarz"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />
          </div>

          {/* Date input */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-foreground">
              Zertifikat-Datum
            </Label>
            <Input
              type="date"
              value={certDate}
              onChange={(e) => setCertDate(e.target.value)}
            />
          </div>

          {chosen && (
            <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-2 text-sm">
              <p>
                <span className="font-medium">Produkt:</span> {chosen.name} V
                {chosen.version ?? 1}
              </p>
              <p>
                <span className="font-medium">Basic UDI-DI:</span>{" "}
                <code className="text-xs font-mono">{udiDi}</code>
              </p>
              <p>
                <span className="font-medium">Typ:</span>{" "}
                {isCombo
                  ? "Combo Frame (Kunststoff + Metall)"
                  : "Full Frame (Kunststoff)"}
              </p>
              <p>
                <span className="font-medium">Hersteller:</span>{" "}
                {org?.name || "—"}
              </p>
              {settings.srn && (
                <p>
                  <span className="font-medium">SRN:</span> {settings.srn}
                </p>
              )}
              <p>
                <span className="font-medium">Risikoklasse:</span> Klasse I
              </p>
            </div>
          )}

          {(() => {
            const missing: string[] = [];
            if (!settings.address) missing.push("Adresse");
            if (!settings.atu_number) missing.push("UID-Nummer");
            if (!settings.city) missing.push("Stadt");
            if (!settings.contact_person)
              missing.push("Ansprechpartner (Art. 15 MDR)");
            if (chosen && !chosen.master_udi_di_base)
              missing.push("Basic UDI-DI (im Design fehlt)");
            if (missing.length > 0) {
              return (
                <Alert
                  variant="destructive"
                  className="border-destructive/30 bg-destructive/5"
                >
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="space-y-1">
                    <p className="font-medium">Fehlende Pflichtfelder:</p>
                    <ul className="list-disc list-inside text-xs">
                      {missing.map((m) => (
                        <li key={m}>{m}</li>
                      ))}
                    </ul>
                    <p className="text-xs">
                      Bitte in{" "}
                      <Link
                        to="/settings"
                        className="underline font-medium"
                        onClick={() => onOpenChange(false)}
                      >
                        Einstellungen
                      </Link>{" "}
                      oder im Design ergänzen.
                    </p>
                  </AlertDescription>
                </Alert>
              );
            }
            return null;
          })()}

          <Button
            className="w-full gap-2"
            disabled={
              !chosen ||
              !org ||
              generating ||
              !settings.address ||
              !settings.atu_number ||
              !settings.city ||
              !settings.contact_person ||
              !udiDi
            }
            onClick={handleGenerate}
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Wird generiert…
              </>
            ) : (
              <>
                <Download className="h-4 w-4" /> PDF herunterladen
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CertificateDialog;
