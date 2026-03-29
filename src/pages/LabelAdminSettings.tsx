import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { useIsLabelAdmin } from "@/hooks/useLabelMembers";
import { useLabels } from "@/hooks/useLabels";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/utils";

interface LabelAdminSettingsProps {
  /** When true, skip the document title and outer wrapper — used inside SettingsPage tab */
  embedded?: boolean;
}

const LabelAdminSettings = ({ embedded = false }: LabelAdminSettingsProps) => {
  useDocumentTitle(embedded ? null : "Label – Einstellungen");
  const { labelId } = useIsLabelAdmin();
  const { data: labels, isLoading: labelsLoading } = useLabels();
  const label = labels?.find((l) => l.id === labelId);
  const qc = useQueryClient();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [termsConditions, setTermsConditions] = useState("");

  useEffect(() => {
    if (label) {
      setName(label.name);
      setDescription(label.description ?? "");
      setContactEmail(label.contact_email ?? "");
      setContactPhone(label.contact_phone ?? "");
      setTermsConditions(label.terms_conditions ?? "");
    }
  }, [label]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!labelId) throw new Error("Kein Label");
      const { error } = await supabase
        .from("labels")
        .update({
          name,
          description: description || null,
          contact_email: contactEmail || null,
          contact_phone: contactPhone || null,
          terms_conditions: termsConditions || null,
        })
        .eq("id", labelId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["labels"] });
      toast({ title: "Gespeichert", description: "Label-Einstellungen aktualisiert." });
    },
    onError: (err: unknown) => {
      toast({ title: "Fehler", description: getErrorMessage(err), variant: "destructive" });
    },
  });

  if (!labelId) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
        Kein Label zugewiesen. Bitte zuerst eine Label-Mitgliedschaft anlegen.
      </div>
    );
  }

  if (labelsLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!label) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
        Label nicht gefunden. Es wurde möglicherweise gelöscht.
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Card className="glass">
        <CardHeader><CardTitle className="text-base">Label-Informationen</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Beschreibung</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>E-Mail</Label><Input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} type="email" /></div>
            <div className="space-y-1.5"><Label>Telefon</Label><Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} /></div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader><CardTitle className="text-base">AGB / Nutzungsbedingungen</CardTitle></CardHeader>
        <CardContent>
          <Textarea value={termsConditions} onChange={(e) => setTermsConditions(e.target.value)} rows={8} placeholder="Markdown-Text für die Nutzungsbedingungen …" />
        </CardContent>
      </Card>

      <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending || !name.trim()}>
        {updateMutation.isPending ? "Speichern…" : "Einstellungen speichern"}
      </Button>
    </div>
  );
};

export default LabelAdminSettings;
