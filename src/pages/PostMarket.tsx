import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertTriangle,
  CheckCircle2,
  Plus,
  ChevronsUpDown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useProfile } from "@/hooks/useProfile";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { format } from "date-fns";
import EmptyState from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn, getErrorMessage } from "@/lib/utils";

const reasonOptions = [
  "Bruch des Rahmens",
  "Bügel gebrochen",
  "Scharnier defekt",
  "Druckfehler / Oberfläche",
  "Passform-Reklamation",
  "Allergische Reaktion",
  "Sonstiges",
];

const PostMarket = () => {
  useDocumentTitle("Post-Market-Überwachung");
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [manualUdiPi, setManualUdiPi] = useState("");
  const [saving, setSaving] = useState(false);
  const [resolveDialogId, setResolveDialogId] = useState<string | null>(null);
  const [resolveNote, setResolveNote] = useState("");
  const [resolving, setResolving] = useState(false);
  const [logPickerOpen, setLogPickerOpen] = useState(false);
  const [logSearch, setLogSearch] = useState("");

  const { data: reports, isLoading } = useQuery({
    queryKey: ["post_market_reports", profile?.org_id],
    enabled: !!profile?.org_id,
    queryFn: async () => {
      if (!profile?.org_id) return [];
      const { data, error } = await supabase
        .from("post_market_reports")
        .select(
          "*, production_logs!fk_post_market_reports_production_log(assigned_udi_pi, design_name)",
        )
        .eq("org_id", profile.org_id)
        .order("reported_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Load production logs for picker
  const { data: productionLogs } = useQuery({
    queryKey: ["production_logs_for_postmarket", profile?.org_id],
    enabled: !!profile?.org_id && dialogOpen,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("production_logs")
        .select(
          "id, assigned_udi_pi, design_name, created_at, status, color_name",
        )
        .eq("org_id", profile?.org_id ?? "")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const filteredLogs = useMemo(() => {
    if (!productionLogs) return [];
    if (!logSearch.trim()) return productionLogs;
    const q = logSearch.toLowerCase();
    return productionLogs.filter(
      (l) =>
        l.design_name?.toLowerCase().includes(q) ||
        l.assigned_udi_pi?.toLowerCase().includes(q),
    );
  }, [productionLogs, logSearch]);

  const selectedLog = productionLogs?.find((l) => l.id === selectedLogId);

  const handleSubmit = async () => {
    if (!reason || !profile?.org_id) return;
    setSaving(true);
    try {
      let logId = selectedLogId;

      // Fallback: search by manual UDI-PI
      if (!logId && manualUdiPi.trim()) {
        const { data: logData } = await supabase
          .from("production_logs")
          .select("id")
          .eq("assigned_udi_pi", manualUdiPi.trim())
          .eq("org_id", profile.org_id)
          .maybeSingle();
        logId = logData?.id ?? null;
      }

      const { error } = await supabase.from("post_market_reports").insert({
        org_id: profile.org_id,
        production_log_id: logId,
        reason,
        description: description.trim() || null,
        reported_by: profile.id,
      });
      if (error) throw error;

      toast({
        title: "Vorfall gemeldet",
        description: "Der Vorfall wurde erfolgreich erfasst.",
      });
      queryClient.invalidateQueries({ queryKey: ["post_market_reports"] });
      setDialogOpen(false);
      setReason("");
      setDescription("");
      setSelectedLogId(null);
      setManualUdiPi("");
    } catch (err: unknown) {
      toast({
        title: "Fehler",
        description: getErrorMessage(err),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleResolve = async () => {
    if (!resolveDialogId || !resolveNote.trim() || !profile?.org_id) return;
    setResolving(true);
    try {
      const { error } = await supabase
        .from("post_market_reports")
        .update({
          status: "resolved",
          resolution_note: resolveNote.trim(),
          resolved_at: new Date().toISOString(),
        })
        .eq("id", resolveDialogId)
        .eq("org_id", profile.org_id);
      if (error) throw error;
      toast({
        title: "Vorfall gelöst",
        description: "Der Vorfall wurde als gelöst markiert.",
      });
      queryClient.invalidateQueries({ queryKey: ["post_market_reports"] });
      setResolveDialogId(null);
      setResolveNote("");
    } catch (err: unknown) {
      toast({
        title: "Fehler",
        description: getErrorMessage(err),
        variant: "destructive",
      });
    } finally {
      setResolving(false);
    }
  };

  const statusBadge = (status: string) => {
    if (status === "open")
      return (
        <Badge
          variant="outline"
          className="bg-warning/10 text-warning border-warning/20 text-xs"
        >
          Offen
        </Badge>
      );
    if (status === "resolved")
      return (
        <Badge
          variant="outline"
          className="bg-success/10 text-success border-success/20 text-xs"
        >
          Gelöst
        </Badge>
      );
    return (
      <Badge variant="outline" className="text-xs">
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground animate-slide-left">
          Post-Market-Überwachung
        </h1>
        <Button
          className="gap-2"
          disabled={!profile?.org_id}
          onClick={() => setDialogOpen(true)}
        >
          <Plus className="h-4 w-4" /> Vorfall melden
        </Button>
      </div>

      <Card className="glass animate-fade-in">
        <CardHeader>
          <CardTitle className="text-base">Gemeldete Vorfälle</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-20" />
                </div>
              ))}
            </div>
          ) : !reports || reports.length === 0 ? (
            <EmptyState
              icon={AlertTriangle}
              title={
                !profile?.org_id
                  ? "Organisation erforderlich"
                  : "Keine Vorfälle"
              }
              description={
                !profile?.org_id
                  ? "Tritt einer Organisation bei, um Post-Market-Vorfälle zu erfassen."
                  : "Es wurden noch keine Post-Market-Vorfälle gemeldet."
              }
              actionLabel={
                !profile?.org_id ? "Zu den Einstellungen" : undefined
              }
              actionTo={!profile?.org_id ? "/settings" : undefined}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead>Grund</TableHead>
                    <TableHead>Beschreibung</TableHead>
                    <TableHead>Design</TableHead>
                    <TableHead>UDI-PI</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Lösungsbemerkung</TableHead>
                    <TableHead className="text-right">Aktion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {format(new Date(r.reported_at), "dd.MM.yyyy")}
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        {r.reason}
                      </TableCell>
                      <TableCell
                        className="text-sm text-muted-foreground max-w-[200px] truncate"
                        title={r.description ?? ""}
                      >
                        {r.description || "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {r.production_logs?.design_name ?? "—"}
                      </TableCell>
                      <TableCell>
                        <code className="text-xs font-mono">
                          {r.production_logs?.assigned_udi_pi ?? "—"}
                        </code>
                      </TableCell>
                      <TableCell>{statusBadge(r.status)}</TableCell>
                      <TableCell
                        className="text-sm text-muted-foreground max-w-[200px] truncate"
                        title={r.resolution_note ?? ""}
                      >
                        {r.resolution_note || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {r.status === "open" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 text-xs"
                            onClick={() => {
                              setResolveDialogId(r.id);
                              setResolveNote("");
                            }}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Lösen
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={dialogOpen}
        onOpenChange={(v) => {
          if (!v) {
            setReason("");
            setDescription("");
            setSelectedLogId(null);
            setManualUdiPi("");
            setLogSearch("");
            setLogPickerOpen(false);
          }
          setDialogOpen(v);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Vorfall melden</DialogTitle>
            <DialogDescription>
              Erfasse einen neuen Post-Market-Vorfall für deine Organisation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Production log picker */}
            <div className="space-y-2">
              <Label>Rahmen aus Historie wählen</Label>
              <Popover open={logPickerOpen} onOpenChange={setLogPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between font-normal"
                  >
                    {selectedLog ? (
                      <span className="truncate">
                        {selectedLog.design_name ?? "Design"} —{" "}
                        {selectedLog.assigned_udi_pi}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">
                        Rahmen suchen…
                      </span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[380px] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Design oder Seriennummer suchen…"
                      value={logSearch}
                      onValueChange={setLogSearch}
                    />
                    <CommandList>
                      <CommandEmpty>Keine Einträge gefunden.</CommandEmpty>
                      <CommandGroup>
                        {filteredLogs.slice(0, 50).map((log) => (
                          <CommandItem
                            key={log.id}
                            value={log.id}
                            onSelect={() => {
                              setSelectedLogId(log.id);
                              setManualUdiPi("");
                              setLogPickerOpen(false);
                            }}
                            className={cn(
                              selectedLogId === log.id && "bg-accent",
                            )}
                          >
                            <div className="flex flex-col gap-0.5 w-full">
                              <div className="flex justify-between items-center">
                                <span className="font-medium text-sm">
                                  {log.design_name ?? "—"}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {log.created_at
                                    ? format(
                                        new Date(log.created_at),
                                        "dd.MM.yy",
                                      )
                                    : ""}
                                </span>
                              </div>
                              <span className="text-xs font-mono text-muted-foreground">
                                {log.assigned_udi_pi}
                                {log.color_name ? ` · ${log.color_name}` : ""}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {selectedLog && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-auto py-1 px-2"
                  onClick={() => setSelectedLogId(null)}
                >
                  Auswahl aufheben
                </Button>
              )}
            </div>

            {/* Manual fallback */}
            {!selectedLogId && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Oder Seriennummer manuell eingeben
                </Label>
                <Input
                  placeholder="Seriennummer / UDI-PI"
                  value={manualUdiPi}
                  onChange={(e) => setManualUdiPi(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Grund</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Grund wählen" />
                </SelectTrigger>
                <SelectContent>
                  {reasonOptions.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>
                Beschreibung{" "}
                {reason === "Sonstiges" && (
                  <span className="text-destructive">*</span>
                )}
              </Label>
              <Textarea
                placeholder="Details zum Vorfall…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button
              disabled={
                !reason ||
                (reason === "Sonstiges" && !description.trim()) ||
                saving
              }
              onClick={handleSubmit}
            >
              {saving ? "Wird gespeichert…" : "Vorfall melden"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Löse-Dialog */}
      <Dialog
        open={!!resolveDialogId}
        onOpenChange={(v) => {
          if (!v) {
            setResolveDialogId(null);
            setResolveNote("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Vorfall lösen</DialogTitle>
            <DialogDescription>
              Beschreibe, wie der Vorfall gelöst wurde.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>
                Bemerkung zur Lösung <span className="text-destructive">*</span>
              </Label>
              <Textarea
                placeholder="Beschreiben Sie, warum der Vorfall als gelöst gilt…"
                value={resolveNote}
                onChange={(e) => setResolveNote(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setResolveDialogId(null);
                setResolveNote("");
              }}
            >
              Abbrechen
            </Button>
            <Button
              disabled={!resolveNote.trim() || resolving}
              onClick={handleResolve}
            >
              {resolving ? "Wird gespeichert…" : "Als gelöst markieren"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PostMarket;
