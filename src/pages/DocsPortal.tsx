import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FileText, ShieldCheck, ClipboardList, Download, Lock } from "lucide-react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const getPublicUrl = (file: string) => {
  const { data } = supabase.storage.from("regulatory-docs").getPublicUrl(file);
  return data.publicUrl;
};

const documents = [
  {
    title: "Technische Dokumentation",
    description: "Technische Spezifikationen und Materialangaben für Digital Eyewear gemäß MDR 2017/745",
    icon: FileText,
    badge: "TD",
    file: "td.pdf",
  },
  {
    title: "Risikomanagement",
    description: "Risikoanalyse und -bewertung nach ISO 14971",
    icon: ClipboardList,
    badge: "RM",
    file: "rm.pdf",
  },
  {
    title: "Gebrauchsanweisung",
    description: "Anweisung für den Endkunden zur Pflege und Handhabung",
    icon: FileText,
    badge: "IFU",
    file: "ifu.pdf",
  },
  {
    title: "EU-Konformitätserklärung (Vorlage)",
    description: "Vorlage für die EU-Konformitätserklärung gemäß MDR 2017/745",
    icon: ShieldCheck,
    badge: "DoC",
    file: "doc.pdf",
  },
];

const AGB_TEXT = `Allgemeine Geschäftsbedingungen für die Nutzung der technischen Dokumentation

1. Die bereitgestellte technische Dokumentation dient ausschließlich als Vorlage und Orientierungshilfe für die regulatorische Konformität Ihrer Produkte.

2. Genera3D übernimmt keine Haftung für die Richtigkeit, Vollständigkeit oder Aktualität der bereitgestellten Dokumente. Die Verantwortung für die regulatorische Konformität liegt beim jeweiligen Hersteller.

3. Der Hersteller ist verpflichtet, die Dokumentation an seine spezifischen Produkte und Prozesse anzupassen und die Konformität eigenständig sicherzustellen.

4. Mit der Akzeptanz dieser AGB bestätigt der Nutzer, dass er die alleinige Verantwortung für die Nutzung und Anpassung der Dokumente trägt.

5. Diese Dokumente dürfen nicht an Dritte weitergegeben werden.`;



const DocsPortal = () => {
  useDocumentTitle("Dokumenten-Portal");
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const [agreed, setAgreed] = useState(false);
  const [accepting, setAccepting] = useState(false);

  const hasAccepted = !!profile?.docs_tc_accepted_at;

  const handleAccept = async () => {
    if (!user || !agreed) return;
    setAccepting(true);
    const { error } = await supabase
      .from("profiles")
      .update({ docs_tc_accepted_at: new Date().toISOString() })
      .eq("id", user.id);
    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "AGB akzeptiert", description: "Du hast nun Zugang zum Dokumenten-Portal." });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    }
    setAccepting(false);
  };

  const handleDownload = async (file: string, title: string) => {
    // Check if file exists first
    const { data } = await supabase.storage.from("regulatory-docs").list("", { search: file });
    if (!data || data.length === 0) {
      toast({ title: "Noch nicht verfügbar", description: `Die Datei "${title}" wurde noch nicht hochgeladen.` });
      return;
    }
    window.open(getPublicUrl(file), "_blank");
  };

  if (!hasAccepted) {
    return (
      <div className="space-y-6 max-w-2xl">
        <h1 className="text-2xl font-semibold text-foreground">Dokumenten-Portal</h1>

        <Card className="glass border-warning/20">
          <CardHeader className="flex flex-row items-center gap-3">
            <Lock className="h-5 w-5 text-warning" />
            <CardTitle className="text-base">AGB-Akzeptanz erforderlich</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Bevor du auf die technische Dokumentation zugreifen kannst, musst du die folgenden Allgemeinen Geschäftsbedingungen akzeptieren.
            </p>

            <div className="bg-muted/50 border border-border rounded-md p-4 max-h-64 overflow-y-auto">
              <pre className="text-xs text-foreground whitespace-pre-wrap font-sans leading-relaxed">
                {AGB_TEXT}
              </pre>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="agree"
                checked={agreed}
                onCheckedChange={(checked) => setAgreed(checked === true)}
              />
              <label htmlFor="agree" className="text-sm text-foreground cursor-pointer leading-tight">
                Ich habe die AGB gelesen und akzeptiere die Bedingungen für die Nutzung der technischen Dokumentation.
              </label>
            </div>

            <Button onClick={handleAccept} disabled={!agreed || accepting}>
              {accepting ? "Wird gespeichert…" : "AGB akzeptieren & Zugang erhalten"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-foreground">Dokumenten-Portal</h1>
          <Badge variant="outline" className="text-xs text-success border-success/30">AGB akzeptiert</Badge>
        </div>

        <p className="text-sm text-muted-foreground max-w-xl">
          Hier findest du alle regulatorischen Vorlagen für die Herstellung von Digital Eyewear. Diese Dokumente dienen als Grundlage für deine eigene technische Dokumentation.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {documents.map((doc, i) => (
            <Card key={i} className="glass card-lift animate-fade-in" style={{ animationDelay: `${i * 80}ms` }}>
              <CardHeader className="flex flex-row items-center gap-3 pb-2">
                <doc.icon className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <CardTitle className="text-base">{doc.title}</CardTitle>
                </div>
                <Badge variant="outline" className="text-xs">{doc.badge}</Badge>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">{doc.description}</p>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => handleDownload(doc.file, doc.title)}
                    >
                      <Download className="h-3.5 w-3.5" /> Dokument herunterladen
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Klicke zum Download – falls nicht hochgeladen, wirst du informiert.</p>
                  </TooltipContent>
                </Tooltip>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
};

export default DocsPortal;
