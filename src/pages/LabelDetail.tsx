import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, Phone, FileText, Ruler, Weight, Barcode, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLabelBySlug } from "@/hooks/useLabels";
import { useLabelDesigns, type LabelDesign } from "@/hooks/useLabelDesigns";
import { useIsSubscribed, useSubscribeToLabel } from "@/hooks/useLabelSubscription";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useProfile } from "@/hooks/useProfile";
import SubscribeDialog from "@/components/labels/SubscribeDialog";
import EmptyState from "@/components/EmptyState";

const DesignCard = ({ design }: { design: LabelDesign }) => (
  <Card className="overflow-hidden animate-fade-in">
    {design.image_url && (
      <div className="h-36 w-full bg-muted overflow-hidden">
        <img src={design.image_url} alt={design.name} className="h-full w-full object-contain" />
      </div>
    )}
    <CardHeader className="pb-2">
      <div className="flex items-center justify-between gap-2">
        <CardTitle className="text-base truncate">{design.name}</CardTitle>
        <Badge variant="outline" className="text-xs shrink-0">v{design.version}</Badge>
      </div>
    </CardHeader>
    <CardContent className="space-y-1.5 text-sm text-muted-foreground">
      {(design.lens_width_mm != null || design.bridge_width_mm != null || design.temple_length_mm != null) && (
        <p className="flex items-center gap-1.5">
          <Ruler className="h-3.5 w-3.5" />
          {[design.lens_width_mm, design.bridge_width_mm, design.temple_length_mm].filter(v => v != null).join(" · ")} mm
        </p>
      )}
      {design.weight_g != null && (
        <p className="flex items-center gap-1.5"><Weight className="h-3.5 w-3.5" /> {design.weight_g} g</p>
      )}
      <p className="flex items-center gap-1.5 truncate">
        <Barcode className="h-3.5 w-3.5" />
        <code className="font-mono text-xs text-foreground truncate">{design.master_udi_di_base}</code>
      </p>
      {design.manufacturer_name && (
        <p className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" /> {design.manufacturer_name}</p>
      )}
    </CardContent>
  </Card>
);

const LabelDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const hasOrg = !!profile?.org_id;
  const { data: label, isLoading: labelLoading } = useLabelBySlug(slug);
  const { data: designs, isLoading: designsLoading } = useLabelDesigns(label?.id);
  const { isSubscribed, isLoading: subLoading } = useIsSubscribed(label?.id);
  const subscribe = useSubscribeToLabel();
  const [showSubscribe, setShowSubscribe] = useState(false);

  useDocumentTitle(label?.name ?? "Label");

  if (labelLoading) {
    return <div className="space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-64 w-full" /></div>;
  }

  if (!label) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate("/labels")}><ArrowLeft className="h-4 w-4 mr-2" /> Zurück</Button>
        <EmptyState icon={Barcode} title="Label nicht gefunden" description="Dieses Label existiert nicht." />
      </div>
    );
  }

  const handleSubscribe = async () => {
    try {
      await subscribe.mutateAsync(label.id);
      setShowSubscribe(false);
    } catch {
      // Error toast is handled by the mutation's onError or global handler
    }
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate("/labels")} className="gap-2">
        <ArrowLeft className="h-4 w-4" /> Zurück zum Shop
      </Button>

      {/* Label Header */}
      <div className="flex flex-col sm:flex-row items-start gap-6">
        {label.logo_url && (
          <div className="h-20 w-20 rounded-lg bg-muted overflow-hidden shrink-0 flex items-center justify-center">
            <img src={label.logo_url} alt={label.name} className="h-full w-full object-contain p-2" />
          </div>
        )}
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">{label.name}</h1>
            {isSubscribed && <Badge className="bg-primary/15 text-primary border-primary/30">Abonniert</Badge>}
          </div>
          {label.description && <p className="text-muted-foreground">{label.description}</p>}
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {label.contact_email && <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> {label.contact_email}</span>}
            {label.contact_phone && <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {label.contact_phone}</span>}
            {label.ce_certificate_url && (
              <a href={label.ce_certificate_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-primary hover:underline">
                <FileText className="h-3.5 w-3.5" /> CE-Zertifikat
              </a>
            )}
          </div>
        </div>
        <div className="shrink-0">
          {!subLoading && !isSubscribed && hasOrg && (
            <Button onClick={() => label.terms_conditions ? setShowSubscribe(true) : handleSubscribe()} disabled={subscribe.isPending}>
              {subscribe.isPending ? "Wird abonniert…" : "Label abonnieren"}
            </Button>
          )}
          {!subLoading && !isSubscribed && !hasOrg && (
            <p className="text-sm text-muted-foreground">Organisation erforderlich zum Abonnieren</p>
          )}
        </div>
      </div>

      {/* Designs */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Designs</h2>
        {designsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <Card key={i}><CardContent className="pt-6"><Skeleton className="h-36 w-full" /></CardContent></Card>)}
          </div>
        ) : !designs?.length ? (
          <EmptyState icon={Barcode} title="Noch keine Designs" description="Dieses Label hat noch keine Designs veröffentlicht." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {designs.map((d) => <DesignCard key={d.id} design={d} />)}
          </div>
        )}
      </div>

      {/* Subscribe Dialog */}
      <SubscribeDialog
        open={showSubscribe}
        onOpenChange={setShowSubscribe}
        labelName={label.name}
        termsConditions={label.terms_conditions ?? ""}
        onAccept={handleSubscribe}
        isPending={subscribe.isPending}
      />
    </div>
  );
};

export default LabelDetail;
