import { useMemo } from "react";
import { Store } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLabels } from "@/hooks/useLabels";
import { useLabelSubscriptions } from "@/hooks/useLabelSubscription";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useNavigate } from "react-router-dom";
import EmptyState from "@/components/EmptyState";

const Labels = () => {
  useDocumentTitle("Label-Shop");
  const { data: labels, isLoading } = useLabels(true);
  const { data: subs } = useLabelSubscriptions();
  const navigate = useNavigate();

  const subscribedIds = useMemo(
    () => new Set(subs?.map((s) => s.label_id) ?? []),
    [subs],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Store className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Label-Shop</h1>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-40 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !labels?.length ? (
        <EmptyState
          icon={Store}
          title="Keine Labels verfügbar"
          description="Es sind derzeit keine Labels im Shop."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {labels.map((label) => (
            <Card
              key={label.id}
              className="group cursor-pointer card-lift overflow-hidden"
              onClick={() => navigate(`/labels/${label.slug}`)}
            >
              {label.logo_url && (
                <div className="h-32 w-full bg-muted overflow-hidden flex items-center justify-center">
                  <img
                    src={label.logo_url}
                    alt={label.name}
                    className="h-full w-full object-contain p-4"
                  />
                </div>
              )}
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base truncate">
                    {label.name}
                  </CardTitle>
                  {subscribedIds.has(label.id) && (
                    <Badge className="bg-primary/15 text-primary border-primary/30 text-xs shrink-0">
                      Abonniert
                    </Badge>
                  )}
                </div>
              </CardHeader>
              {label.description && (
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {label.description}
                  </p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Labels;
