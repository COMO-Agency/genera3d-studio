import { useMemo, useId } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Activity, Box, Info, ArrowRight, RefreshCw, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/EmptyState";


import { useOrganization } from "@/hooks/useOrganization";
import { useAllProductionLogs } from "@/hooks/useAllProductionLogs";
import { useProfile } from "@/hooks/useProfile";
import { useTypewriter } from "@/hooks/useTypewriter";
import { useCountUp } from "@/hooks/useCountUp";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { format, subDays, startOfDay } from "date-fns";
import { modeLabelMap, productionStatusLabelMap } from "@/lib/constants";

const MiniSparkline = ({ data, color }: { data: { v: number }[]; color: string }) => {
  const uid = useId();
  if (!data.length) return <div className="h-10" />;
  const max = Math.max(...data.map(d => d.v), 1);
  const points = data.map((d, i) => `${(i / (data.length - 1)) * 100},${40 - (d.v / max) * 36}`).join(" ");
  return (
    <svg viewBox="0 0 100 40" className="w-full h-10 animate-fade-in">
      <defs>
        <linearGradient id={`spark-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={`hsl(var(--${color}))`} stopOpacity={0.3} />
          <stop offset="100%" stopColor={`hsl(var(--${color}))`} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon points={`0,40 ${points} 100,40`} fill={`url(#spark-${uid})`} />
      <polyline points={points} fill="none" stroke={`hsl(var(--${color}))`} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const KpiSkeleton = () => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-4 w-4 rounded" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-9 w-20 mb-1" />
      <Skeleton className="h-3 w-16" />
    </CardContent>
  </Card>
);

const TableSkeleton = () => (
  <div className="space-y-2">
    <div className="flex gap-4">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-4 w-28" />
    </div>
    {[1, 2, 3].map((i) => (
      <div key={i} className="flex gap-4 py-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-5 w-28" />
      </div>
    ))}
  </div>
);


function buildSparkline(logs: any[]): { v: number }[] {
  const now = new Date();
  const days: { v: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = startOfDay(subDays(now, i));
    const dayEnd = startOfDay(subDays(now, i - 1));
    const count = logs.filter((l) => {
      const d = new Date(l.created_at);
      return d >= dayStart && d < dayEnd;
    }).length;
    days.push({ v: count });
  }
  return days;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Guten Morgen";
  if (h < 18) return "Guten Nachmittag";
  return "Guten Abend";
}

const Dashboard = () => {
  useDocumentTitle("Dashboard");
  const { data: org, isLoading: orgLoading, isError: orgError, refetch: refetchOrg } = useOrganization();
  const { data: allLogsData, isLoading: logsLoading } = useAllProductionLogs();
  const allLogs = allLogsData?.logs;
  const { data: profile } = useProfile();
  
  
  
  const navigate = useNavigate();

  const firstName = profile?.full_name?.split(" ")[0] ?? "";
  const greetingText = `${getGreeting()}${firstName ? `, ${firstName}` : ""}`;
  const { displayed: greeting, done: greetingDone } = useTypewriter(greetingText, 45);

  const todayPrinted = useMemo(() => {
    if (!allLogs) return 0;
    const today = startOfDay(new Date());
    return allLogs.filter((l) => l.created_at ? new Date(l.created_at) >= today : false).length;
  }, [allLogs]);

  const todayCount = useCountUp(todayPrinted);

  
  const recentLogs = useMemo(() => allLogs?.slice(0, 8) ?? [], [allLogs]);
  const displayLogs = recentLogs.length > 0 ? recentLogs : null;

  const productionTrend = useMemo(() => {
    if (!allLogs || allLogs.length === 0) return [{ v: 0 }, { v: 0 }, { v: 0 }, { v: 0 }, { v: 0 }, { v: 0 }, { v: 0 }];
    return buildSparkline(allLogs);
  }, [allLogs]);

  return (
    <div className="space-y-6">
      {/* Hero Greeting */}
      <div className="animate-slide-left">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
          {greeting}
          {!greetingDone && <span className="inline-block w-0.5 h-6 bg-primary ml-0.5 animate-pulse-soft" />}
        </h1>
        <p className="text-sm text-muted-foreground mt-1 animate-fade-in stagger-3">
          {todayPrinted > 0
            ? `${todayPrinted} ${todayPrinted === 1 ? "Auftrag" : "Aufträge"} heute angelegt — weiter so!`
            : "Dein nächstes Design wartet auf dich."
          }
        </p>
      </div>

      {/* Error Recovery */}
      {orgError && (
        <Alert className="border-destructive/30 bg-destructive/5 animate-fade-in">
          <Info className="h-4 w-4 text-destructive" />
          <AlertTitle className="text-foreground">Verbindungsfehler</AlertTitle>
          <AlertDescription className="text-muted-foreground">
            Organisation konnte nicht geladen werden.
            <Button variant="outline" size="sm" className="ml-3 gap-2" onClick={() => refetchOrg()}>
              <RefreshCw className="h-3.5 w-3.5" /> Erneut versuchen
            </Button>
          </AlertDescription>
        </Alert>
      )}


      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {!profile?.org_id ? (
          <Card className="glass col-span-full animate-slide-up">
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              Tritt einer Organisation bei, um KPI-Daten und Produktionsstatistiken zu sehen.
            </CardContent>
          </Card>
        ) : orgLoading ? (
          <>{[1, 2, 3].map((i) => <KpiSkeleton key={i} />)}</>
        ) : (
          <>
            <Card className="glass card-lift animate-slide-up stagger-1">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Heute produziert</CardTitle>
                <Activity className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{todayCount}</div>
                <p className="text-xs text-muted-foreground mt-1">Rahmen heute</p>
                <MiniSparkline data={productionTrend} color="primary" />
              </CardContent>
            </Card>

            <Card className="glass card-lift animate-slide-up stagger-2">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">GTIN-Pool</CardTitle>
                <Box className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <p className="text-sm font-medium text-foreground">Organisationspool</p>
                <p className="text-xs text-muted-foreground mt-1">GTINs werden bei Produktion vergeben</p>
              </CardContent>
            </Card>

            <Card className="glass card-lift animate-slide-up stagger-3">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Material</CardTitle>
                <Box className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <p className="text-sm font-medium text-foreground">Digital Eyewear</p>
                <p className="text-xs text-muted-foreground mt-1">Standardmaterial</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Quick Actions */}
      {!!profile?.org_id && (
        <div className="flex flex-wrap gap-3 animate-fade-in stagger-4">
          <Button variant="outline" className="gap-2" onClick={() => navigate("/catalog")}>
            <Box className="h-4 w-4" /> Rahmen anlegen
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => navigate("/register")}>
            <Activity className="h-4 w-4" /> Register anzeigen
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => navigate("/post-market")}>
            <AlertTriangle className="h-4 w-4" /> Post-Market
          </Button>
        </div>
      )}

      {/* Recent Activity */}
      <Card className="glass animate-fade-in stagger-5">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Letzte Aktivität</CardTitle>
          {displayLogs && (
            <Button variant="link" size="sm" className="gap-1 text-xs" onClick={() => navigate("/register")}>
              Alle anzeigen <ArrowRight className="h-3 w-3" />
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <TableSkeleton />
          ) : displayLogs ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Design</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Modus</TableHead>
                  <TableHead>Farbe</TableHead>
                  <TableHead>Zeitstempel</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayLogs.map((log, i) => (
                  <TableRow key={log.id} className="animate-fade-in hover:bg-muted/50 transition-colors cursor-pointer" style={{ animationDelay: `${i * 50}ms` }} onClick={() => navigate("/register")}>
                    <TableCell className="font-medium">{log.design_name ?? "Unbekannt"}</TableCell>
                    <TableCell>
                      <span className="text-sm">{productionStatusLabelMap[log.status ?? ""] ?? log.status ?? "—"}</span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{modeLabelMap[log.mode ?? ""] ?? log.mode ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground capitalize">{log.color_name ?? log.color ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {log.created_at ? format(new Date(log.created_at), "dd.MM.yyyy HH:mm") : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState
              icon={Activity}
              title={!profile?.org_id ? "Organisation erforderlich" : "Noch keine Produktionslogs"}
              description={!profile?.org_id
                ? "Tritt einer Organisation bei, um Produktionsdaten zu sehen."
                : "Starte deinen ersten Druckauftrag im Katalog, um hier Aktivitäten zu sehen."}
              actionLabel={profile?.org_id ? "Zum Katalog" : undefined}
              actionTo={profile?.org_id ? "/catalog" : undefined}
            />
          )}
        </CardContent>
      </Card>

      
    </div>
  );
};

export default Dashboard;
