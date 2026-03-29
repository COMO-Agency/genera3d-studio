import { useState, useEffect, useRef, useCallback } from "react";
import { getErrorMessage } from "@/lib/utils";
import { parseOrgSettings } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import {
  Moon,
  Sun,
  User,
  Building2,
  Palette,
  Cog,
  Copy,
  Check,
  Upload,
  ImageIcon,
  ShieldCheck,
  Tag,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useProfile } from "@/hooks/useProfile";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useAdminScopes } from "@/hooks/useAdminScopes";
import LabelAdminSettings from "@/pages/LabelAdminSettings";

// Debounce helper
const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
};

const SettingsPage = () => {
  useDocumentTitle("Einstellungen");
  const { data: org, isLoading } = useOrganization();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);

  const [copied, setCopied] = useState(false);
  const { data: profile } = useProfile();
  const { hasLabelScope } = useAdminScopes();
  const sigFileRef = useRef<HTMLInputElement>(null);
  const mdrSigFileRef = useRef<HTMLInputElement>(null);
  const logoFileRef = useRef<HTMLInputElement>(null);
  const [sigUploading, setSigUploading] = useState(false);
  const [mdrSigUploading, setMdrSigUploading] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);

  const orgSettings = parseOrgSettings(org?.settings);

  // Machine serials
  const [g1Serial, setG1Serial] = useState(orgSettings.g1_serial ?? "");
  const [f1Serial, setF1Serial] = useState(orgSettings.f1_serial ?? "");
  const [c1Serial, setC1Serial] = useState(orgSettings.c1_serial ?? "");

  // Org details
  const [orgAddress, setOrgAddress] = useState(orgSettings.address ?? "");
  const [orgAtu, setOrgAtu] = useState(orgSettings.atu_number ?? "");
  const [orgPhone, setOrgPhone] = useState(orgSettings.phone ?? "");
  const [orgEmail, setOrgEmail] = useState(orgSettings.email ?? "");
  const [orgContact, setOrgContact] = useState(
    orgSettings.contact_person ?? "",
  );
  const [orgCity, setOrgCity] = useState(orgSettings.city ?? "");
  const [orgMdrPerson, setOrgMdrPerson] = useState(
    orgSettings.mdr_responsible_person ?? "",
  );
  const [orgSrn, setOrgSrn] = useState(orgSettings.srn ?? "");
  const [orgCeoName, setOrgCeoName] = useState(orgSettings.ceo_name ?? "");

  useEffect(() => {
    if (profile?.full_name) setFullName(profile.full_name);
  }, [profile?.full_name]);

  const settingsJson = JSON.stringify(org?.settings ?? null);
  useEffect(() => {
    const parsed = parseOrgSettings(org?.settings);
    setG1Serial(parsed.g1_serial ?? "");
    setF1Serial(parsed.f1_serial ?? "");
    setC1Serial(parsed.c1_serial ?? "");
    setOrgAddress(parsed.address ?? "");
    setOrgAtu(parsed.atu_number ?? "");
    setOrgPhone(parsed.phone ?? "");
    setOrgEmail(parsed.email ?? "");
    setOrgContact(parsed.contact_person ?? "");
    setOrgCity(parsed.city ?? "");
    setOrgMdrPerson(parsed.mdr_responsible_person ?? "");
    setOrgSrn(parsed.srn ?? "");
    setOrgCeoName(parsed.ceo_name ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsJson]);

  const saveNameDebounced = useDebounce(fullName, 1000);
  const [hasNameChanged, setHasNameChanged] = useState(false);

  const handleSaveName = useCallback(async () => {
    if (!user || !fullName.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName.trim() })
        .eq("id", user.id);
      if (error) throw error;
      toast({
        title: "Gespeichert",
        description: "Dein Name wurde aktualisiert.",
      });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setHasNameChanged(false);
    } catch (err: unknown) {
      toast({
        title: "Fehler",
        description: getErrorMessage(err),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }, [user, fullName, queryClient]);

  useEffect(() => {
    if (
      hasNameChanged &&
      saveNameDebounced &&
      saveNameDebounced !== profile?.full_name
    ) {
      handleSaveName();
    }
  }, [saveNameDebounced, handleSaveName, hasNameChanged, profile?.full_name]);

  const saveOrgSettings = async (updates: Record<string, unknown>) => {
    if (!org) return;
    const { data: fresh, error: fetchErr } = await supabase
      .from("organizations")
      .select("settings")
      .eq("id", org.id)
      .single();
    if (fetchErr) {
      toast({
        title: "Fehler",
        description: fetchErr.message,
        variant: "destructive",
      });
      return;
    }
    const currentSettings = parseOrgSettings(fresh?.settings);
    const newSettings = { ...currentSettings, ...updates };
    const { error } = await supabase
      .from("organizations")
      .update({
        settings:
          newSettings as unknown as import("@/integrations/supabase/types").Json,
      })
      .eq("id", org.id);
    if (error) {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Gespeichert" });
      queryClient.invalidateQueries({ queryKey: ["organization"] });
    }
  };

  const handleSaveMachines = () => {
    if (!g1Serial.trim() || !f1Serial.trim()) {
      toast({
        title: "Pflichtfelder",
        description: "G1 und F1 Seriennummern sind erforderlich.",
        variant: "destructive",
      });
      return;
    }
    saveOrgSettings({
      g1_serial: g1Serial.trim(),
      f1_serial: f1Serial.trim(),
      c1_serial: c1Serial.trim() || null,
    });
  };

  const handleSaveOrgDetails = () => {
    saveOrgSettings({
      address: orgAddress.trim(),
      city: orgCity.trim(),
      atu_number: orgAtu.trim(),
      phone: orgPhone.trim(),
      email: orgEmail.trim(),
      contact_person: orgContact.trim(),
    });
  };

  const handleSaveCertDetails = () => {
    saveOrgSettings({
      mdr_responsible_person: orgMdrPerson.trim(),
      srn: orgSrn.trim(),
      ceo_name: orgCeoName.trim(),
    });
  };

  const handleSignatureUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file || !org) return;
    setSigUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${org.id}/signature.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("org-signatures")
        .upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage
        .from("org-signatures")
        .getPublicUrl(path);
      await saveOrgSettings({ signature_url: urlData.publicUrl });
      toast({ title: "Unterschrift hochgeladen" });
    } catch (err: unknown) {
      toast({
        title: "Upload fehlgeschlagen",
        description: getErrorMessage(err),
        variant: "destructive",
      });
    } finally {
      setSigUploading(false);
      if (sigFileRef.current) sigFileRef.current.value = "";
    }
  };

  const handleMdrSignatureUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file || !org) return;
    setMdrSigUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${org.id}/mdr_signature.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("org-signatures")
        .upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage
        .from("org-signatures")
        .getPublicUrl(path);
      await saveOrgSettings({ mdr_signature_url: urlData.publicUrl });
      toast({ title: "MDR-Unterschrift hochgeladen" });
    } catch (err: unknown) {
      toast({
        title: "Upload fehlgeschlagen",
        description: getErrorMessage(err),
        variant: "destructive",
      });
    } finally {
      setMdrSigUploading(false);
      if (mdrSigFileRef.current) mdrSigFileRef.current.value = "";
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !org) return;
    setLogoUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${org.id}/logo.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("org-signatures")
        .upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage
        .from("org-signatures")
        .getPublicUrl(path);
      await saveOrgSettings({ logo_url: urlData.publicUrl });
      toast({ title: "Logo hochgeladen" });
    } catch (err: unknown) {
      toast({
        title: "Upload fehlgeschlagen",
        description: getErrorMessage(err),
        variant: "destructive",
      });
    } finally {
      setLogoUploading(false);
      if (logoFileRef.current) logoFileRef.current.value = "";
    }
  };

  // Determine default tab based on scope
  const defaultTab = "profile";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Einstellungen</h1>

      <Tabs defaultValue={defaultTab} className="max-w-2xl">
        <TabsList className="overflow-x-auto w-full justify-start">
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-3.5 w-3.5" /> Profil
          </TabsTrigger>
          <TabsTrigger value="organization" className="gap-2">
            <Building2 className="h-3.5 w-3.5" /> Organisation
          </TabsTrigger>
          <TabsTrigger value="machines" className="gap-2">
            <Cog className="h-3.5 w-3.5" /> Maschinen
          </TabsTrigger>
          <TabsTrigger value="certificate" className="gap-2">
            <ShieldCheck className="h-3.5 w-3.5" /> Zertifikat
          </TabsTrigger>
          {hasLabelScope && (
            <TabsTrigger value="label" className="gap-2">
              <Tag className="h-3.5 w-3.5" /> Mein Label
            </TabsTrigger>
          )}
          <TabsTrigger value="appearance" className="gap-2">
            <Palette className="h-3.5 w-3.5" /> Darstellung
          </TabsTrigger>
        </TabsList>

        {/* Profil */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Benutzerprofil</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14">
                  <AvatarFallback className="text-lg bg-primary/10 text-primary">
                    {(fullName || user?.email || "?")
                      .split(/\s+/)
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {fullName || "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {user?.email ?? "—"}
                  </p>
                  {profile?.role && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] capitalize mt-1"
                    >
                      {profile.role}
                    </Badge>
                  )}
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label
                  htmlFor="fullName"
                  className="text-muted-foreground text-xs"
                >
                  Vollständiger Name
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      setHasNameChanged(true);
                    }}
                    placeholder="Dein Name"
                    className="max-w-xs"
                    aria-describedby={saving ? "name-saving" : undefined}
                  />
                  <Button
                    size="sm"
                    onClick={handleSaveName}
                    disabled={
                      saving ||
                      !fullName.trim() ||
                      fullName === profile?.full_name
                    }
                    aria-live="polite"
                  >
                    {saving ? "Wird gespeichert…" : "Speichern"}
                  </Button>
                </div>
                {saving && (
                  <p id="name-saving" className="text-xs text-muted-foreground">
                    Wird gespeichert…
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Organisation */}
        <TabsContent value="organization">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Organisation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!profile?.org_id ? (
                <p className="text-sm text-muted-foreground py-4">
                  Du bist keiner Organisation zugeordnet. Tritt einer
                  Organisation bei, um diese Einstellungen zu sehen.
                </p>
              ) : org ? (
                <>
                  <div>
                    <Label className="text-muted-foreground text-xs">
                      Organisationsname
                    </Label>
                    {isLoading ? (
                      <Skeleton className="h-5 w-40 mt-1" />
                    ) : (
                      <p className="text-sm font-medium text-foreground mt-1">
                        {org.name}
                      </p>
                    )}
                  </div>
                  <Separator />
                  <div>
                    <Label className="text-muted-foreground text-xs">
                      Lizenzschlüssel
                    </Label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-sm font-mono font-medium text-foreground bg-muted px-2 py-1 rounded">
                        {org.license_key ?? "—"}
                      </code>
                      {org.license_key && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          aria-label="Lizenzschlüssel kopieren"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(
                                org.license_key ?? "",
                              );
                              setCopied(true);
                              setTimeout(() => setCopied(false), 2000);
                            } catch {
                              /* non-critical */
                            }
                          }}
                        >
                          {copied ? (
                            <Check className="h-3.5 w-3.5 text-success" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-3">
                    <Label className="text-muted-foreground text-xs">
                      Firmendaten
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Adresse</Label>
                        <Input
                          value={orgAddress}
                          onChange={(e) => setOrgAddress(e.target.value)}
                          placeholder="Straße, PLZ Ort, Land"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Stadt</Label>
                        <Input
                          value={orgCity}
                          onChange={(e) => setOrgCity(e.target.value)}
                          placeholder="z.B. Wien"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">UID-Nummer</Label>
                        <Input
                          value={orgAtu}
                          onChange={(e) => setOrgAtu(e.target.value)}
                          placeholder="z.B. ATU12345678 / CHE-123.456.789"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Telefon</Label>
                        <Input
                          value={orgPhone}
                          onChange={(e) => setOrgPhone(e.target.value)}
                          placeholder="+43 ..."
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">E-Mail</Label>
                        <Input
                          value={orgEmail}
                          onChange={(e) => setOrgEmail(e.target.value)}
                          placeholder="info@..."
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Ansprechpartner</Label>
                        <Input
                          value={orgContact}
                          onChange={(e) => setOrgContact(e.target.value)}
                          placeholder="Name"
                        />
                      </div>
                    </div>
                    <Button size="sm" onClick={handleSaveOrgDetails}>
                      Firmendaten speichern
                    </Button>
                  </div>
                </>
              ) : (
                <Skeleton className="h-40 w-full" />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Maschinen */}
        <TabsContent value="machines">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Maschinen & Seriennummern
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!profile?.org_id ? (
                <p className="text-sm text-muted-foreground py-4">
                  Du bist keiner Organisation zugeordnet. Tritt einer
                  Organisation bei, um Maschinen zu konfigurieren.
                </p>
              ) : !org ? (
                <Skeleton className="h-40 w-full" />
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Trage die Seriennummern deiner Maschinen ein. G1 und F1 sind
                    Pflichtfelder.
                  </p>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs">
                        G1 Seriennummer{" "}
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        value={g1Serial}
                        onChange={(e) => setG1Serial(e.target.value)}
                        placeholder="G1 Seriennummer eingeben"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">
                        F1 Seriennummer{" "}
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        value={f1Serial}
                        onChange={(e) => setF1Serial(e.target.value)}
                        placeholder="F1 Seriennummer eingeben"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">
                        C1 Seriennummer (optional)
                      </Label>
                      <Input
                        value={c1Serial}
                        onChange={(e) => setC1Serial(e.target.value)}
                        placeholder="C1 Seriennummer eingeben"
                      />
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <Label className="text-muted-foreground text-xs">
                      Material
                    </Label>
                    <p className="text-sm font-medium text-foreground mt-1">
                      Digital Eyewear
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Standardmaterial für alle Druckaufträge
                    </p>
                  </div>
                  <Button size="sm" onClick={handleSaveMachines}>
                    Maschinen speichern
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Zertifikat & Branding */}
        <TabsContent value="certificate">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Zertifikat & Branding</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {!profile?.org_id ? (
                <p className="text-sm text-muted-foreground py-4">
                  Du bist keiner Organisation zugeordnet. Tritt einer
                  Organisation bei, um Zertifikate zu verwalten.
                </p>
              ) : !org ? (
                <Skeleton className="h-40 w-full" />
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Diese Daten werden in die EU-Konformitätserklärung
                    eingebettet.
                  </p>

                  {/* Logo Upload */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">
                      Organisations-Logo
                    </Label>
                    <input
                      ref={logoFileRef}
                      type="file"
                      accept="image/png,image/jpeg"
                      className="hidden"
                      onChange={handleLogoUpload}
                    />
                    <div className="flex items-center gap-3">
                      {orgSettings.logo_url ? (
                        <div className="h-16 w-16 border border-border rounded bg-background p-1">
                          <img
                            src={orgSettings.logo_url}
                            alt="Logo"
                            className="h-full w-full object-contain"
                          />
                        </div>
                      ) : (
                        <div className="h-16 w-16 border-2 border-dashed border-border rounded flex items-center justify-center">
                          <ImageIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        disabled={logoUploading}
                        onClick={() => logoFileRef.current?.click()}
                      >
                        <Upload className="h-3.5 w-3.5" />
                        {logoUploading
                          ? "Wird hochgeladen…"
                          : orgSettings.logo_url
                            ? "Ersetzen"
                            : "Hochladen"}
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      PNG oder JPEG. Kann auf Labels und Zertifikaten verwendet
                      werden.
                    </p>
                  </div>

                  <Separator />

                  {/* SRN & MDR Person */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">SRN (Registriernummer)</Label>
                      <Input
                        value={orgSrn}
                        onChange={(e) => setOrgSrn(e.target.value)}
                        placeholder="Single Registration Number"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Wird im CE-Zertifikat angegeben
                      </p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">CEO / Geschäftsführer</Label>
                      <Input
                        value={orgCeoName}
                        onChange={(e) => setOrgCeoName(e.target.value)}
                        placeholder="Name des Geschäftsführers"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Wird als Unterzeichner im CE-Zertifikat angezeigt.
                      </p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">
                        Verantwortliche Person (Art. 15 MDR)
                      </Label>
                      <Input
                        value={orgMdrPerson}
                        onChange={(e) => setOrgMdrPerson(e.target.value)}
                        placeholder="Name der verantwortlichen Person"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Pflichtangabe für die EU-Konformitätserklärung.
                      </p>
                    </div>
                  </div>

                  <Button size="sm" onClick={handleSaveCertDetails}>
                    Zertifikatdaten speichern
                  </Button>

                  <Separator />

                  {/* CEO Signature */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">
                      CEO-Unterschrift
                    </Label>
                    <input
                      ref={sigFileRef}
                      type="file"
                      accept="image/png,image/jpeg"
                      className="hidden"
                      onChange={handleSignatureUpload}
                    />
                    <div className="flex items-center gap-3">
                      {orgSettings.signature_url ? (
                        <div className="h-16 w-40 border border-border rounded bg-background p-1">
                          <img
                            src={orgSettings.signature_url}
                            alt="CEO-Unterschrift"
                            className="h-full w-full object-contain"
                          />
                        </div>
                      ) : (
                        <div className="h-16 w-40 border-2 border-dashed border-border rounded flex items-center justify-center">
                          <ImageIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        disabled={sigUploading}
                        onClick={() => sigFileRef.current?.click()}
                      >
                        <Upload className="h-3.5 w-3.5" />
                        {sigUploading
                          ? "Wird hochgeladen…"
                          : orgSettings.signature_url
                            ? "Ersetzen"
                            : "Hochladen"}
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Wird in der CEO-Spalte der EU-Konformitätserklärung
                      angezeigt.
                    </p>
                  </div>

                  {/* MDR Signature */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">
                      MDR-Verantwortliche Unterschrift
                    </Label>
                    <input
                      ref={mdrSigFileRef}
                      type="file"
                      accept="image/png,image/jpeg"
                      className="hidden"
                      onChange={handleMdrSignatureUpload}
                    />
                    <div className="flex items-center gap-3">
                      {orgSettings.mdr_signature_url ? (
                        <div className="h-16 w-40 border border-border rounded bg-background p-1">
                          <img
                            src={orgSettings.mdr_signature_url}
                            alt="MDR-Unterschrift"
                            className="h-full w-full object-contain"
                          />
                        </div>
                      ) : (
                        <div className="h-16 w-40 border-2 border-dashed border-border rounded flex items-center justify-center">
                          <ImageIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        disabled={mdrSigUploading}
                        onClick={() => mdrSigFileRef.current?.click()}
                      >
                        <Upload className="h-3.5 w-3.5" />
                        {mdrSigUploading
                          ? "Wird hochgeladen…"
                          : orgSettings.mdr_signature_url
                            ? "Ersetzen"
                            : "Hochladen"}
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Optional. Falls leer, wird die CEO-Unterschrift auch für
                      die MDR-Spalte verwendet.
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Label Settings — only if hasLabelScope */}
        {hasLabelScope && (
          <TabsContent value="label">
            <LabelAdminSettings embedded />
          </TabsContent>
        )}

        {/* Darstellung */}
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Darstellung</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Dunkelmodus</Label>
                  <p className="text-xs text-muted-foreground">
                    Zwischen hellem und dunklem Design wechseln
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Sun className="h-4 w-4 text-muted-foreground" />
                  <Switch
                    checked={theme === "dark"}
                    onCheckedChange={(checked) =>
                      setTheme(checked ? "dark" : "light")
                    }
                  />
                  <Moon className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
