import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import {
  Search, Filter, FileText, Download, LayoutList, Clock, Copy, Check,
  ClipboardCheck, XCircle, ShieldCheck, QrCode, Info, ArrowUp, ArrowDown,
  ArrowUpDown, ImageDown,
} from "lucide-react";
import { toParenthesisedGs1 } from "@/components/Gs1DataMatrix"; // eslint-disable-line @typescript-eslint/no-unused-vars
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import EmptyState from "@/components/EmptyState";
import QcCheckDialog from "@/components/QcCheckDialog";
import CertificateDialog from "@/components/CertificateDialog";
import UdiDetailSheet from "@/components/UdiDetailSheet";
import Gs1DataMatrix from "@/components/Gs1DataMatrix"; // eslint-disable-line @typescript-eslint/no-unused-vars
import { useAllProductionLogs } from "@/hooks/useAllProductionLogs";
import { useOrganization } from "@/hooks/useOrganization";
import { useProfile } from "@/hooks/useProfile";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { productionStatusLabelMap, productionStatusColorMap, modeLabelMap } from "@/lib/constants";
import { generatePsaCertificatePdf } from "@/lib/generatePsaCertificatePdf";
import { getErrorMessage } from "@/lib/utils";
import { parseOrgSettings } from "@/lib/types";
import type { CancelProductionResult } from "@/lib/types";


// PAGE_SIZE defined inside component

/** Split a GS1 string into colored segments */
const Gs1Breakdown = ({ gs1 }: { gs1: string }) => {
  const match = gs1.match(/^\(01\)(.+?)\(11\)(.+?)\(21\)(.+)$/);
  if (!match) return <span className="font-mono text-xs text-muted-foreground">{gs1}</span>;
  return (
    <span className="font-mono text-xs leading-relaxed">
      <span className="text-primary">(01)</span><span className="text-primary font-semibold">{match[1]}</span>
      <span className="text-warning">(11)</span><span className="text-warning font-semibold">{match[2]}</span>
      <span className="text-success">(21)</span><span className="text-success font-semibold">{match[3]}</span>
    </span>
  );
};

const escapeCsv = (value: string): string => {
  const str = String(value);
  if (/^[+\-=@\t\r\n]/.test(str)) return `"'${str.replace(/"/g, '""')}"`;
  if (str.includes('"') || str.includes('\n') || str.includes('\r') || str.includes(',')) return `"${str.replace(/"/g, '""')}"`;
  return str;
};

const downloadQrCode = async (gs1String: string, filename: string) => {
  try {
    const bwipjs = (await import("bwip-js")).default;
    const canvas = document.createElement("canvas");
    bwipjs.toCanvas(canvas, { bcid: "gs1qrcode", text: toParenthesisedGs1(gs1String), scale: 5, parsefnc: true, backgroundcolor: "FFFFFF" });
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `qr-${filename}.png`;
    a.click();
  } catch {
    toast({ title: "Fehler", description: "QR-Code konnte nicht erstellt werden.", variant: "destructive" });
  }
};

const ProductionRegister = () => {
  useDocumentTitle("Produktionsregister");
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();
  const hasOrg = !!profile?.org_id;
  const PAGE_SIZE = 25;
  const [page, setPage] = useState(0);
  const { data, isLoading } = useAllProductionLogs({ page, pageSize: PAGE_SIZE });
  const { data: org } = useOrganization(); // eslint-disable-line @typescript-eslint/no-unused-vars
  const settings = parseOrgSettings(org?.settings);
  const logs = data?.logs;
  const totalCount = data?.total ?? 0;

  // Shared state
  const [search, setSearch] = useState("");
  const [modeFilter, setModeFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("register");

  // Sort state
  const [sortKey, setSortKey] = useState<"date" | "design" | "mode">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Dialog state
  const [qcTarget, setQcTarget] = useState<{ logId: string; designName: string } | null>(null);
  const [cancelTarget, setCancelTarget] = useState<{ logId: string; designName: string } | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [certDesign, setCertDesign] = useState<{ id: string; name: string; master_udi_di_base: string; version: number | null; defaultColor?: string } | null>(null);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const selectedLog = selectedLogId ? logs?.find((l) => l.id === selectedLogId) ?? null : null;

  const handlePsaCertificate = async (log: NonNullable<typeof logs>[number]) => {
    if (!settings.address || !settings.city) {
      toast({ title: "Fehlende Firmendaten", description: "Bitte hinterlegen Sie Adresse und Stadt in den Einstellungen, bevor Sie ein PSA-Zertifikat erstellen.", variant: "destructive" });
      return;
    }
    try {
      const { data: glassData, error: glassError } = await supabase
        .from("sunglasses_glass_data").select("*").eq("production_log_id", log.id).maybeSingle();
      if (glassError) {
        toast({ title: "Glasdaten konnten nicht geladen werden", description: glassError.message, variant: "destructive" });
        return;
      }
      await generatePsaCertificatePdf({
        orgName: org?.name ?? "", address: settings.address ?? "", city: settings.city ?? "",
        contactPerson: settings.contact_person ?? "", designName: log.design_name ?? "Sonnenbrille",
        serialNumber: log.assigned_udi_pi ?? "", glassType: glassData?.glass_type ?? "unbekannt",
        filterCategory: glassData?.filter_category ?? "—", glassManufacturer: glassData?.glass_manufacturer ?? "—",
        mdrResponsiblePerson: settings.mdr_responsible_person ?? undefined,
        atuNumber: settings.atu_number ?? undefined,
        ceoName: settings.ceo_name ?? undefined,
        srn: settings.srn ?? undefined,
        logoUrl: settings.logo_url ?? undefined,
        signatureUrl: settings.signature_url ?? undefined,
        mdrSignatureUrl: settings.mdr_signature_url ?? undefined,
      });
      toast({ title: "PSA-CE-Erklärung erstellt", description: "PDF wurde heruntergeladen." });
    } catch (err: unknown) {
      toast({ title: "Fehler", description: getErrorMessage(err), variant: "destructive" });
    }
  };

  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setCopiedId(null), 2000);
      toast({ title: "Kopiert", description: text });
    } catch {
      toast({ title: "Fehler", description: "Kopieren fehlgeschlagen.", variant: "destructive" });
    }
  };
  useEffect(() => () => clearTimeout(copyTimeoutRef.current), []);

  // Filtered & sorted data
  const filtered = useMemo(() => {
    if (!logs) return [];
    const now = new Date();
    const result = logs.filter((log) => {
      const q = search.toLowerCase();
      const matchesSearch = !q ||
        (log.design_name ?? "").toLowerCase().includes(q) ||
        (log.full_udi_string ?? "").toLowerCase().includes(q) ||
        (log.assigned_udi_pi ?? "").toLowerCase().includes(q) ||
        (log.design_udi_di_base ?? "").toLowerCase().includes(q) ||
        (log.customer_ref ?? "").toLowerCase().includes(q);
      const matchesMode = modeFilter === "all" || log.mode === modeFilter;
      const matchesStatus = statusFilter === "all" || log.status === statusFilter;
      let matchesDate = true;
      if (dateRange !== "all" && log.created_at) {
        const daysAgo = new Date(now.getTime() - parseInt(dateRange) * 86400000);
        matchesDate = new Date(log.created_at) >= daysAgo;
      }
      return matchesSearch && matchesMode && matchesStatus && matchesDate;
    });
    return [...result].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "date") cmp = (a.created_at ?? "").localeCompare(b.created_at ?? "");
      else if (sortKey === "design") cmp = (a.design_name ?? "").localeCompare(b.design_name ?? "");
      else if (sortKey === "mode") cmp = (a.mode ?? "").localeCompare(b.mode ?? "");
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [logs, search, modeFilter, statusFilter, dateRange, sortKey, sortDir]);

  // Server-side pagination: logs is already the current page
  const paginated = filtered;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const stats = useMemo(() => {
    if (!logs) return { total: 0, qcPassed: 0, qcPending: 0, failed: 0, gtinCount: 0 };
    return {
      total: logs.length,
      qcPassed: logs.filter((l) => l.status === "qc_passed" || l.status === "printed").length,
      qcPending: logs.filter((l) => l.status === "qc_pending").length,
      failed: logs.filter((l) => l.status === "failed" || l.status === "qc_failed").length,
      gtinCount: logs.filter((l) =>
        l.assigned_udi_pi &&
        l.full_udi_string &&
        l.status !== "cancelled" &&
        l.status !== "qc_failed"
      ).length,
    };
  }, [logs]);

  const handleExportCSV = useCallback(() => {
    if (!filtered.length) return;
    const headers = ["Design", "Status", "Modus", "Farbe", "Kundenreferenz", "UDI-PI", "UDI-DI", "GS1 String", "Zeitstempel"];
    const rows = filtered.map((log) => [
      log.design_name ?? "", productionStatusLabelMap[log.status ?? ""] ?? log.status ?? "",
      modeLabelMap[log.mode ?? ""] ?? log.mode ?? "", log.color_name ?? log.color ?? "",
      log.customer_ref ?? "", log.assigned_udi_pi ?? "", log.design_udi_di_base ?? "",
      log.full_udi_string ?? "", log.created_at ? format(new Date(log.created_at), "yyyy-MM-dd HH:mm:ss") : "",
    ]);
    const csv = "\uFEFF" + [headers, ...rows].map((r) => r.map(escapeCsv).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `produktionsregister-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "CSV exportiert", description: `${filtered.length} Einträge exportiert.` });
  }, [filtered]);

  const handleCancel = useCallback(async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      const { data, error } = await supabase.rpc("cancel_production", { p_production_log_id: cancelTarget.logId });
      if (error) throw error;
      const result = data as unknown as CancelProductionResult;
      toast({ title: "Auftrag storniert", description: result?.gtin_returned ? "Die GTIN wurde in den Pool zurückgelegt." : "Auftrag wurde storniert." });
      queryClient.invalidateQueries({ queryKey: ["production_logs_all"] });
      queryClient.invalidateQueries({ queryKey: ["organization"] });
      queryClient.invalidateQueries({ queryKey: ["gtin-pool-count"] });
    } catch (err: unknown) {
      toast({ title: "Fehler", description: getErrorMessage(err), variant: "destructive" });
    } finally {
      setCancelling(false);
      setCancelTarget(null);
    }
  }, [cancelTarget, queryClient]);

  const handleSort = (key: "date" | "design" | "mode") => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir(key === "date" ? "desc" : "asc"); }
    setPage(0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <ClipboardCheck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Produktionsregister</h1>
            <p className="text-xs text-muted-foreground">Operative Übersicht und GTIN-Verzeichnis — MDR/PSA-konform</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">{data?.total ?? stats.total} Aufträge</Badge>
          <Badge variant="outline" className="text-xs font-mono gap-1">
            <QrCode className="h-3 w-3" /> {stats.gtinCount} GTINs
          </Badge>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExportCSV} disabled={!filtered.length}>
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {isLoading ? [1,2,3,4].map((i) => (
          <Card key={i}><CardContent className="pt-4"><Skeleton className="h-8 w-16 mb-1" /><Skeleton className="h-3 w-20" /></CardContent></Card>
        )) : (
          <>
            <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-foreground">{stats.total}</div><p className="text-xs text-muted-foreground">Gesamt</p></CardContent></Card>
            <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-success">{stats.qcPassed}</div><p className="text-xs text-muted-foreground">QC bestanden</p></CardContent></Card>
            <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-warning">{stats.qcPending}</div><p className="text-xs text-muted-foreground">QC ausstehend</p></CardContent></Card>
            <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-destructive">{stats.failed}</div><p className="text-xs text-muted-foreground">Fehlgeschlagen</p></CardContent></Card>
          </>
        )}
      </div>

      {/* Tabs: Register + Zeitstrahl */}
      <Tabs value={activeTab} onValueChange={(t) => { setActiveTab(t); setPage(0); }}>
        <TabsList>
          <TabsTrigger value="register" className="gap-1.5"><LayoutList className="h-3.5 w-3.5" /> Register</TabsTrigger>
          <TabsTrigger value="zeitstrahl" className="gap-1.5"><Clock className="h-3.5 w-3.5" /> Zeitstrahl</TabsTrigger>
        </TabsList>

        {/* Info Banners */}
        {activeTab === "register" && (
          <div className="space-y-3 mt-4">
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="py-3 flex items-start gap-3">
                <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>
                    <strong>CE-Zertifikate</strong> können pro Eintrag als PDF heruntergeladen werden (Spalte „Zertifikat").
                    <strong> QR-Codes</strong> stehen im Detail-Sheet zum Download bereit — klicke auf eine Zeile.
                  </p>
                  <div className="font-mono text-[11px] bg-background/50 rounded px-2 py-1 inline-flex gap-0.5">
                    <span className="text-primary">(01) GTIN</span>
                    <span className="text-muted-foreground mx-1">+</span>
                    <span className="text-warning">(11) Datum</span>
                    <span className="text-muted-foreground mx-1">+</span>
                    <span className="text-success">(21) Seriennr.</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="mt-4">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Suche nach Design, UDI, GS1, Kunde…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} className="pl-9" />
              </div>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
                <SelectTrigger className="w-full sm:w-[150px]"><Filter className="h-3.5 w-3.5 mr-2" /><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Status</SelectItem>
                  <SelectItem value="qc_pending">QC ausstehend</SelectItem>
                  <SelectItem value="qc_passed">QC bestanden</SelectItem>
                  <SelectItem value="qc_failed">QC fehlgeschlagen</SelectItem>
                  <SelectItem value="printed">Gedruckt</SelectItem>
                  <SelectItem value="failed">Fehlgeschlagen</SelectItem>
                  <SelectItem value="cancelled">Storniert</SelectItem>
                </SelectContent>
              </Select>
              <Select value={modeFilter} onValueChange={(v) => { setModeFilter(v); setPage(0); }}>
                <SelectTrigger className="w-full sm:w-[150px]"><SelectValue placeholder="Modus" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Modi</SelectItem>
                  <SelectItem value="optical">Optische Brille</SelectItem>
                  <SelectItem value="optical_sun">Opt. Sonnenbrille</SelectItem>
                  <SelectItem value="sunglasses">Sonnenbrille</SelectItem>
                  <SelectItem value="series">Serie (Legacy)</SelectItem>
                  <SelectItem value="custom">Sonderanf. (Legacy)</SelectItem>
                </SelectContent>
              </Select>
              <Select value={dateRange} onValueChange={(v) => { setDateRange(v); setPage(0); }}>
                <SelectTrigger className="w-full sm:w-[140px]"><SelectValue placeholder="Zeitraum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle</SelectItem>
                  <SelectItem value="7">Letzte 7 Tage</SelectItem>
                  <SelectItem value="30">Letzte 30 Tage</SelectItem>
                  <SelectItem value="90">Letzte 90 Tage</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {/* ==================== UNIFIED REGISTER TAB ==================== */}
            <TabsContent value="register" className="mt-0">
              {isLoading ? (
                <div className="space-y-3">{[1,2,3,4,5].map((i) => <div key={i} className="flex gap-4"><Skeleton className="h-5 w-32" /><Skeleton className="h-5 w-20" /><Skeleton className="h-5 w-24" /><Skeleton className="h-5 w-40" /><Skeleton className="h-5 w-28" /></div>)}</div>
              ) : filtered.length === 0 ? (
                <EmptyState icon={FileText} title={!hasOrg ? "Organisation erforderlich" : "Keine Einträge gefunden"} description={!hasOrg ? "Tritt einer Organisation bei, um das Produktionsregister zu nutzen." : search || statusFilter !== "all" || modeFilter !== "all" ? "Versuche andere Filter oder Suchbegriffe." : "Lege deinen ersten Rahmen im Katalog an."} actionLabel={hasOrg ? "Zum Katalog" : undefined} actionTo={hasOrg ? "/catalog" : undefined} />
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <SortableHead label="Design" sortKey="design" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                          <TableHead>Status</TableHead>
                          <TableHead>QC</TableHead>
                          <SortableHead label="Modus" sortKey="mode" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                          <TableHead>Farbe</TableHead>
                          <TableHead>Kundenreferenz</TableHead>
                          <TableHead>UDI-PI</TableHead>
                          <TableHead>
                            <Tooltip><TooltipTrigger className="flex items-center gap-1 cursor-help">UDI-DI <Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger><TooltipContent>Device Identifier — Basis-Kennung des Designs</TooltipContent></Tooltip>
                          </TableHead>
                          <TableHead>GS1 String / QR</TableHead>
                          <TableHead>Zertifikat-Download</TableHead>
                          <SortableHead label="Datum" sortKey="date" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginated.map((log, i) => (
                          <TableRow key={log.id} className="animate-fade-in cursor-pointer hover:bg-muted/50" style={{ animationDelay: `${i * 20}ms` }} onClick={() => setSelectedLogId(log.id)}>
                            <TableCell>
                              <div>
                                <span className="font-medium text-foreground">{log.design_name ?? "Unbekannt"}</span>
                                <span className="block text-xs text-muted-foreground">V{log.design_version ?? "—"}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-xs ${productionStatusColorMap[log.status ?? ""] ?? ""}`}>
                                {productionStatusLabelMap[log.status ?? ""] ?? log.status ?? "—"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {log.status === "qc_pending" ? (
                                 <div className="flex items-center gap-1">
                                   <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={(e) => { e.stopPropagation(); setQcTarget({ logId: log.id, designName: log.design_name ?? "" }); }}>
                                     <ClipboardCheck className="h-3 w-3" /> Prüfen
                                   </Button>
                                  <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); setCancelTarget({ logId: log.id, designName: log.design_name ?? "" }); }}>
                                    <XCircle className="h-3 w-3" /> Storno
                                  </Button>
                                </div>
                              ) : log.status === "qc_passed" ? (
                                <span className="text-success text-xs">✓ Bestanden</span>
                              ) : log.status === "qc_failed" ? (
                                <span className="text-destructive text-xs">✗ Nicht bestanden</span>
                              ) : log.status === "cancelled" ? (
                                <span className="text-muted-foreground text-xs">⊘ Storniert</span>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </TableCell>
                            <TableCell><Badge variant="outline" className="text-xs">{modeLabelMap[log.mode ?? ""] ?? log.mode ?? "—"}</Badge></TableCell>
                            <TableCell>{log.color ? <Badge variant="secondary" className="text-xs capitalize">{log.color_name ?? log.color}</Badge> : <span className="text-muted-foreground">—</span>}</TableCell>
                            <TableCell><span className="text-xs text-muted-foreground">{log.customer_ref ?? "—"}</span></TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <code className="text-xs font-mono font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">{log.assigned_udi_pi ?? "—"}</code>
                                {log.assigned_udi_pi && (
                                  <button onClick={(e) => { e.stopPropagation(); copyToClipboard(log.assigned_udi_pi as string, `pi-${log.id}`); }} className="text-muted-foreground hover:text-foreground" aria-label="UDI-PI kopieren">
                                    {copiedId === `pi-${log.id}` ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                                  </button>
                                )}
                              </div>
                            </TableCell>
                            <TableCell><code className="text-xs font-mono text-muted-foreground">{log.design_udi_di_base ?? "—"}</code></TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Gs1Breakdown gs1={log.full_udi_string ?? ""} />
                                {log.full_udi_string && (
                                  <>
                                    <button onClick={(e) => { e.stopPropagation(); copyToClipboard(log.full_udi_string as string, `gs1-${log.id}`); }} className="text-muted-foreground hover:text-foreground transition-colors shrink-0" aria-label="GS1 String kopieren">
                                      {copiedId === `gs1-${log.id}` ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); downloadQrCode(log.full_udi_string as string, log.assigned_udi_pi ?? log.id); }} className="text-muted-foreground hover:text-foreground transition-colors shrink-0" aria-label="QR-Code herunterladen">
                                      <ImageDown className="h-3 w-3" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {log.status !== "cancelled" && log.design_name && log.design_udi_di_base && (
                                log.mode === "sunglasses" ? (
                                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={(e) => { e.stopPropagation(); handlePsaCertificate(log); }}>
                                    <ShieldCheck className="h-3 w-3" /> PSA
                                  </Button>
                                ) : log.mode === "optical_sun" ? (
                                  <div className="flex gap-1">
                                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" disabled={!log.design_id}
                                      onClick={(e) => { e.stopPropagation(); if (!log.design_id) return; setCertDesign({ id: log.design_id, name: log.design_name ?? "Unbekannt", master_udi_di_base: log.design_udi_di_base ?? "", version: log.design_version ?? null, defaultColor: log.color_name ?? undefined }); }}>
                                      <ShieldCheck className="h-3 w-3" /> MDR
                                    </Button>
                                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={(e) => { e.stopPropagation(); handlePsaCertificate(log); }}>
                                      <ShieldCheck className="h-3 w-3" /> PSA
                                    </Button>
                                  </div>
                                ) : (
                                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" disabled={!log.design_id}
                                    onClick={(e) => { e.stopPropagation(); if (!log.design_id) return; setCertDesign({ id: log.design_id, name: log.design_name ?? "Unbekannt", master_udi_di_base: log.design_udi_di_base ?? "", version: log.design_version ?? null, defaultColor: log.color_name ?? undefined }); }}>
                                    <ShieldCheck className="h-3 w-3" /> CE
                                  </Button>
                                )
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{log.created_at ? format(new Date(log.created_at), "dd.MM.yyyy HH:mm") : "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <Pagination page={page} setPage={setPage} totalPages={totalPages} totalItems={filtered.length} pageSize={PAGE_SIZE} showPageSelect />
                </>
              )}
            </TabsContent>

            {/* ==================== ZEITSTRAHL TAB ==================== */}
            <TabsContent value="zeitstrahl" className="mt-0">
              {isLoading ? (
                <div className="space-y-3">{[1,2,3,4,5].map((i) => <div key={i} className="flex gap-4"><Skeleton className="h-12 w-full" /></div>)}</div>
              ) : filtered.length === 0 ? (
                <EmptyState icon={Clock} title="Keine Einträge gefunden" description="Versuche andere Filter." />
              ) : (
                <>
                  <div className="relative pl-8 space-y-0">
                    {paginated.map((log, i) => (
                      <div key={log.id} className="relative pb-8 last:pb-0 animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
                        {i < paginated.length - 1 && <div className="absolute left-[-20px] top-3 bottom-0 w-px bg-gradient-to-b from-neon-cyan/40 to-border" />}
                        <div className={`absolute left-[-24px] top-1.5 h-3 w-3 rounded-full border-2 border-background ${log.status === "qc_passed" || log.status === "printed" ? "bg-success" : log.status === "qc_pending" ? "bg-warning" : log.status === "cancelled" ? "bg-muted-foreground" : "bg-destructive"}`} />
                        <div className="glass rounded-lg p-4">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-foreground text-sm">{log.design_name ?? "Unbekannt"}</span>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={`text-xs ${productionStatusColorMap[log.status ?? ""] ?? ""}`}>
                                {productionStatusLabelMap[log.status ?? ""] ?? log.status ?? "—"}
                              </Badge>
                              {log.status === "qc_pending" && (
                                <>
                                   <Button size="sm" variant="outline" className="h-6 text-xs gap-1" onClick={() => setQcTarget({ logId: log.id, designName: log.design_name ?? "" })}>
                                     <ClipboardCheck className="h-3 w-3" /> QC
                                   </Button>
                                  <Button size="sm" variant="ghost" className="h-6 text-xs gap-1 text-destructive hover:text-destructive" onClick={() => setCancelTarget({ logId: log.id, designName: log.design_name ?? "" })}>
                                    <XCircle className="h-3 w-3" /> Storno
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>{modeLabelMap[log.mode ?? ""] ?? log.mode ?? "—"}</span>
                            {log.color && <><span>•</span><span className="capitalize">{log.color_name ?? log.color}</span></>}
                            {log.customer_ref && <><span>•</span><span>{log.customer_ref}</span></>}
                            <span>•</span>
                            <span>{log.created_at ? format(new Date(log.created_at), "dd.MM.yyyy HH:mm") : "—"}</span>
                          </div>
                          {log.assigned_udi_pi && <code className="block mt-2 text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">{log.assigned_udi_pi}</code>}
                        </div>
                      </div>
                    ))}
                  </div>
                  <Pagination page={page} setPage={setPage} totalPages={totalPages} totalItems={filtered.length} pageSize={PAGE_SIZE} />
                </>
              )}
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>

      {/* Dialogs */}
      {qcTarget && <QcCheckDialog open={!!qcTarget} onClose={() => setQcTarget(null)} logId={qcTarget.logId} designName={qcTarget.designName} />}

      <AlertDialog open={!!cancelTarget} onOpenChange={(open) => { if (!open) setCancelTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Auftrag stornieren?</AlertDialogTitle>
            <AlertDialogDescription>
              Auftrag für <strong>{cancelTarget?.designName}</strong> wirklich stornieren? Eine Pool-GTIN wird zurückgelegt, sofern zugewiesen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} disabled={cancelling} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {cancelling ? "Wird storniert…" : "Stornieren"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CertificateDialog
        open={!!certDesign}
        onOpenChange={(open) => { if (!open) setCertDesign(null); }}
        design={certDesign}
        defaultColor={certDesign?.defaultColor}
      />
      <UdiDetailSheet open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLogId(null)} log={selectedLog} />
    </div>
  );
};

/* ── Helper components ── */

const SortableHead = ({ label, sortKey, currentKey, dir, onSort }: { label: string; sortKey: string; currentKey: string; dir: string; onSort: (k: any) => void }) => (
  <TableHead className="cursor-pointer hover:text-foreground select-none" onClick={() => onSort(sortKey)}>
    <span className={`flex items-center gap-1 ${currentKey === sortKey ? "text-foreground font-semibold" : ""}`}>
      {label} {currentKey === sortKey ? (dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
    </span>
  </TableHead>
);

const Pagination = ({ page, setPage, totalPages, totalItems, pageSize, showPageSelect }: { page: number; setPage: (fn: (p: number) => number) => void; totalPages: number; totalItems: number; pageSize: number; showPageSelect?: boolean }) => (
  <div className="flex items-center justify-between pt-4 flex-wrap gap-2">
    <p className="text-xs text-muted-foreground">
      {totalPages > 1 ? `Zeige ${page * pageSize + 1}–${Math.min((page + 1) * pageSize, totalItems)} von ${totalItems}` : `${totalItems} Einträge`}
    </p>
    {totalPages > 1 && (
      <div className="flex items-center gap-2">
        {showPageSelect && totalItems > 100 && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Seite</span>
            <Select value={String(page)} onValueChange={(v) => setPage(() => Number(v))}>
              <SelectTrigger className="h-7 w-[70px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: totalPages }, (_, i) => <SelectItem key={i} value={String(i)}>{i + 1}</SelectItem>)}
              </SelectContent>
            </Select>
            <span>von {totalPages}</span>
          </div>
        )}
        <div className="flex gap-1">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Zurück</Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Weiter</Button>
        </div>
      </div>
    )}
  </div>
);

export default ProductionRegister;
