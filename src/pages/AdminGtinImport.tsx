import { useState, useMemo, useEffect, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, AlertTriangle, Check } from "lucide-react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useIsPlatformAdmin } from "@/hooks/useUserRole";
import { useIsLabelAdmin } from "@/hooks/useLabelMembers";
import { useProfile } from "@/hooks/useProfile";
import { useOrganization } from "@/hooks/useOrganization";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";

// Maximale Anzahl GTINs pro Import (DoS-Schutz)
const MAX_GTIN_IMPORT = 10000;

// GS1 Checksum Berechnung für GTIN-13
const calculateGs1Checksum = (gtin: string): number => {
  if (!/^\d{13}$/.test(gtin)) return -1;
  const digits = gtin.split("").map(Number);
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += digits[i] * (i % 2 === 0 ? 1 : 3);
  }
  const checksum = (10 - (sum % 10)) % 10;
  return checksum;
};

const isValidGtinChecksum = (gtin: string): boolean => {
  if (!/^\d{13}$/.test(gtin)) return false;
  const digits = gtin.split("").map(Number);
  const checkDigit = digits[12];
  return calculateGs1Checksum(gtin.slice(0, 12) + "0") === checkDigit;
};

const AdminGtinImport = () => {
  useDocumentTitle("GTIN-Import");
  const { isPlatformAdmin, isLoading: roleLoading } = useIsPlatformAdmin();
  const { isLabelAdmin, labelId, isLoading: labelLoading } = useIsLabelAdmin();
  const { data: profile } = useProfile();
  const { data: org } = useOrganization();
  const queryClient = useQueryClient();

  const hasAccess = isPlatformAdmin || isLabelAdmin;
  const isLoading = roleLoading || labelLoading;

  const [ownerType, setOwnerType] = useState<"org" | "label">("org");
  const [ownerId, setOwnerId] = useState("");
  const [rawText, setRawText] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ inserted: number; skipped: number } | null>(null);

  // For non-superadmins, auto-set defaults based on their membership
  useEffect(() => {
    if (isPlatformAdmin || isLoading) return;
    if (isLabelAdmin && labelId) {
      setOwnerType("label");
      setOwnerId(labelId);
    } else if (profile?.org_id) {
      setOwnerType("org");
      setOwnerId(profile.org_id);
    }
  }, [isPlatformAdmin, isLabelAdmin, labelId, profile?.org_id, isLoading]);

  // Fetch organizations for dropdown (superadmin only)
  const { data: orgs } = useQuery({
    queryKey: ["admin-orgs"],
    enabled: isPlatformAdmin && ownerType === "org",
    queryFn: async () => {
      const { data, error } = await supabase.from("organizations").select("id, name");
      if (error) throw error;
      return data ?? [];
    },
  });

  // Fetch labels for dropdown (superadmin only)
  const { data: labels } = useQuery({
    queryKey: ["admin-labels"],
    enabled: isPlatformAdmin && ownerType === "label",
    queryFn: async () => {
      const { data, error } = await supabase.from("labels").select("id, name");
      if (error) throw error;
      return data ?? [];
    },
  });

  // Fetch label name for label-admins
  const { data: ownLabel } = useQuery({
    queryKey: ["own-label", labelId],
    enabled: isLabelAdmin && !!labelId && !isPlatformAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("labels")
        .select("id, name")
        .eq("id", labelId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const parsedGtins = useMemo(() => {
    if (!rawText.trim()) return [];
    return rawText
      .split(/[\n,;]+/)
      .map((line) => line.trim())
      .filter((line) => line.length >= 8 && /^\d+$/.test(line));
  }, [rawText]);

  const uniqueGtins = useMemo(() => [...new Set(parsedGtins)], [parsedGtins]);
  const duplicateCount = parsedGtins.length - uniqueGtins.length;

  // GTIN Validierung mit Checksum
  const { validGtins, invalidChecksumGtins } = useMemo(() => {
    const valid: string[] = [];
    const invalid: string[] = [];
    for (const gtin of uniqueGtins) {
      if (gtin.length === 13 && !isValidGtinChecksum(gtin)) {
        invalid.push(gtin);
      } else {
        valid.push(gtin);
      }
    }
    return { validGtins: valid, invalidChecksumGtins: invalid };
  }, [uniqueGtins]);

  const exceedsLimit = uniqueGtins.length > MAX_GTIN_IMPORT;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "xlsx" || ext === "xls") {
      const readXlsxFile = (await import("read-excel-file/browser")).default;
      try {
        const rows = await readXlsxFile(file);
        const header = rows[0]?.map((c) => String(c ?? "").trim()) ?? [];
        let gtinCol = header.findIndex((h) => /^gtin$/i.test(h));
        if (gtinCol < 0) {
          for (let col = 0; col < (header.length || 1); col++) {
            const numericCount = rows.slice(1).filter((r) => {
              const v = String(r[col] ?? "").trim();
              return v.length >= 8 && /^\d+$/.test(v);
            }).length;
            if (numericCount > rows.length * 0.5) { gtinCol = col; break; }
          }
        }
        if (gtinCol < 0) gtinCol = 0;

        const gtins = rows
          .slice(1)
          .map((r) => String(r[gtinCol] ?? "").trim())
          .filter((v) => v.length >= 8 && /^\d+$/.test(v));

        setRawText(gtins.join("\n"));
        toast({ title: "Excel gelesen", description: `${gtins.length} GTINs aus Spalte "${header[gtinCol] || gtinCol + 1}" erkannt.` });
      } catch (err: unknown) {
        toast({ title: "Excel-Fehler", description: getErrorMessage(err), variant: "destructive" });
      }
    } else {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setRawText(ev.target?.result as string ?? "");
      };
      reader.readAsText(file);
    }
  };

  const handleImport = async () => {
    if (!ownerId || validGtins.length === 0) return;

    // DoS-Schutz: Maximale Importgröße
    if (exceedsLimit) {
      toast({
        title: "Import zu groß",
        description: `Maximal ${MAX_GTIN_IMPORT} GTINs pro Import erlaubt. Bitte splitten Sie den Import auf.`,
        variant: "destructive",
      });
      return;
    }

    // Warnung bei ungültigen Checksums
    if (invalidChecksumGtins.length > 0) {
      const proceed = window.confirm(
        `${invalidChecksumGtins.length} GTINs haben ungültige GS1-Checksums. Diese werden übersprungen. Fortfahren?`
      );
      if (!proceed) return;
    }

    setImporting(true);
    setResult(null);

    try {
      // Atomare Duplikatprüfung via RPC (TOCTOU-Schutz)
      const { data: existing, error: existCheckErr } = await supabase
        .from("gtin_pool")
        .select("gtin_value")
        .in("gtin_value", validGtins.slice(0, 1000));

      if (existCheckErr) throw new Error(`Duplikatprüfung fehlgeschlagen: ${existCheckErr.message}`);

      const existingSet = new Set(existing?.map((e) => e.gtin_value) ?? []);

      if (validGtins.length > 1000) {
        for (let i = 1000; i < validGtins.length; i += 1000) {
          const batch = validGtins.slice(i, i + 1000);
          const { data: batchExisting, error: batchErr } = await supabase
            .from("gtin_pool")
            .select("gtin_value")
            .in("gtin_value", batch);
          if (batchErr) throw new Error(`Duplikatprüfung fehlgeschlagen: ${batchErr.message}`);
          batchExisting?.forEach((e) => existingSet.add(e.gtin_value));
        }
      }

      const toInsert = validGtins
        .filter((gtin) => !existingSet.has(gtin))
        .map((gtin) => ({
          owner_type: ownerType,
          owner_id: ownerId,
          gtin_value: gtin,
        }));

      const skipped = validGtins.length - toInsert.length + invalidChecksumGtins.length;

      let inserted = 0;
      for (let i = 0; i < toInsert.length; i += 500) {
        const chunk = toInsert.slice(i, i + 500);
        const { error } = await supabase.from("gtin_pool").insert(chunk);
        if (error) throw error;
        inserted += chunk.length;
      }

      setResult({ inserted, skipped });
      setRawText("");
      toast({ title: "Import abgeschlossen", description: `${inserted} GTINs importiert, ${skipped} übersprungen.` });
      queryClient.invalidateQueries({ queryKey: ["gtin-pool"] });
      queryClient.invalidateQueries({ queryKey: ["gtin-pool-count"] });
    } catch (err: unknown) {
      toast({ title: "Fehler", description: getErrorMessage(err), variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
  if (!hasAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  const owners = ownerType === "org" ? orgs : labels;

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-semibold text-foreground">GTIN-Import</h1>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-base">GTINs importieren</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Owner selection — superadmin: full dropdown, label-admin: org/label toggle */}
          {isPlatformAdmin ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Eigentümertyp</Label>
                <Select value={ownerType} onValueChange={(v) => { setOwnerType(v as "org" | "label"); setOwnerId(""); setResult(null); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="org">Organisation</SelectItem>
                    <SelectItem value="label">Label</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">{ownerType === "org" ? "Organisation" : "Label"}</Label>
                <Select value={ownerId} onValueChange={setOwnerId}>
                  <SelectTrigger><SelectValue placeholder="Auswählen..." /></SelectTrigger>
                  <SelectContent>
                    {owners?.map((o) => (
                      <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : isLabelAdmin && (profile?.org_id && labelId) ? (
            <div className="space-y-2">
              <Label className="text-xs">Importieren für</Label>
              <Select
                value={ownerType === "org" ? profile.org_id : labelId}
                onValueChange={(v) => {
                  if (v === profile.org_id) {
                    setOwnerType("org");
                    setOwnerId(profile.org_id);
                  } else {
                    setOwnerType("label");
                    setOwnerId(labelId);
                  }
                  setResult(null);
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={profile.org_id}>
                    Organisation: {org?.name ?? "Meine Organisation"}
                  </SelectItem>
                  <SelectItem value={labelId}>
                    Label: {ownLabel?.name ?? "Mein Label"}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : ownerId ? (
            <Alert>
              <AlertDescription>
                GTINs werden für {ownerType === "label" ? "dein Label" : "deine Organisation"} importiert.
              </AlertDescription>
            </Alert>
          ) : null}

          {/* CSV Upload */}
          <div className="space-y-2">
            <Label className="text-xs">CSV/TXT/XLSX-Datei hochladen</Label>
            <Input type="file" accept=".csv,.txt,.xlsx,.xls" onChange={handleFileUpload} />
          </div>

          {/* Textarea */}
          <div className="space-y-2">
            <Label className="text-xs">Oder GTINs einfügen (eine pro Zeile)</Label>
            <Textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={"04012345000010\n04012345000027\n04012345000034\n..."}
              rows={8}
              className="font-mono text-xs"
            />
          </div>

          {/* Preview */}
          {rawText.trim() && (
            <div className="flex items-center gap-3 flex-wrap">
              <Badge variant="secondary">{validGtins.length} gültige GTINs</Badge>
              {duplicateCount > 0 && (
                <Badge variant="outline" className="text-warning border-warning/30">
                  <AlertTriangle className="h-3 w-3 mr-1" /> {duplicateCount} Duplikate entfernt
                </Badge>
              )}
              {invalidChecksumGtins.length > 0 && (
                <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/30">
                  <AlertTriangle className="h-3 w-3 mr-1" /> {invalidChecksumGtins.length} ungültige GTINs (Checksum)
                </Badge>
              )}
              {exceedsLimit && (
                <Badge variant="destructive">
                  <AlertTriangle className="h-3 w-3 mr-1" /> Limit überschritten (max {MAX_GTIN_IMPORT})
                </Badge>
              )}
            </div>
          )}

          {result && (
            <Alert className="border-success/30 bg-success/5">
              <Check className="h-4 w-4 text-success" />
              <AlertDescription>
                {result.inserted} GTINs importiert, {result.skipped} übersprungen (bereits vorhanden).
              </AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleImport}
            disabled={importing || !ownerId || validGtins.length === 0 || exceedsLimit}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            {importing ? "Importiere..." : `${validGtins.length} GTINs importieren`}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminGtinImport;
