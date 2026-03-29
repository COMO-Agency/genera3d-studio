import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIsPlatformAdmin } from "@/hooks/useUserRole";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { toast } from "@/hooks/use-toast";
import {
  Building2,
  Plus,
  Copy,
  Pencil,
  Check,
  X,
  Trash2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { de } from "date-fns/locale";

const AdminOrganizations = () => {
  useDocumentTitle("Admin: Organisationen");
  const { isPlatformAdmin, isLoading: roleLoading } = useIsPlatformAdmin();
  const queryClient = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const { data: orgs, isLoading } = useQuery({
    queryKey: ["admin-organizations"],
    enabled: isPlatformAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch member counts per org
  const { data: memberCounts } = useQuery({
    queryKey: ["admin-org-member-counts"],
    enabled: isPlatformAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("org_id");
      if (error) throw error;
      const counts: Record<string, number> = {};
      data?.forEach((p) => {
        if (p.org_id) {
          counts[p.org_id] = (counts[p.org_id] || 0) + 1;
        }
      });
      return counts;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase.rpc("create_organization", {
        p_name: name,
      });
      if (error) throw error;
      return data as unknown as {
        success: boolean;
        id: string;
        name: string;
        license_key: string;
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-organizations"] });
      queryClient.invalidateQueries({ queryKey: ["admin-orgs"] });
      setCreateOpen(false);
      setNewName("");
      toast({
        title: "Organisation erstellt",
        description: `Lizenzschlüssel: ${data.license_key}`,
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Fehler",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { data, error } = await supabase.rpc("admin_update_organization", {
        p_org_id: id,
        p_name: name,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-organizations"] });
      queryClient.invalidateQueries({ queryKey: ["organization"] });
      setEditingId(null);
      toast({ title: "Name aktualisiert" });
    },
    onError: (err: Error) => {
      toast({
        title: "Fehler",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (orgId: string) => {
      const { data, error } = await supabase.rpc("admin_delete_organization", {
        p_org_id: orgId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-organizations"] });
      queryClient.invalidateQueries({ queryKey: ["admin-org-member-counts"] });
      toast({ title: "Organisation gelöscht" });
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description:
          error.message || "Organisation konnte nicht gelöscht werden.",
        variant: "destructive",
      });
    },
  });

  const copyKey = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      toast({
        title: "Kopiert",
        description: "Lizenzschlüssel in Zwischenablage kopiert.",
      });
    } catch {
      toast({
        title: "Fehler",
        description: "Kopieren fehlgeschlagen.",
        variant: "destructive",
      });
    }
  };

  if (roleLoading)
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  if (!isPlatformAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Organisationen</h1>
        </div>
        <Button onClick={() => setCreateOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Neue Organisation
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Alle Organisationen ({orgs?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Lizenzschlüssel</TableHead>
                <TableHead>Mitglieder</TableHead>
                <TableHead>Erstellt</TableHead>
                <TableHead className="w-[120px]">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-8 text-muted-foreground"
                  >
                    Laden…
                  </TableCell>
                </TableRow>
              ) : !orgs?.length ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-8 text-muted-foreground"
                  >
                    Noch keine Organisationen vorhanden.
                  </TableCell>
                </TableRow>
              ) : (
                orgs.map((org) => {
                  const count = memberCounts?.[org.id] ?? 0;
                  return (
                    <TableRow key={org.id}>
                      <TableCell>
                        {editingId === org.id ? (
                          <div className="flex items-center gap-1">
                            <Input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="h-8 w-48"
                              autoFocus
                              onKeyDown={(e) => {
                                if (
                                  e.key === "Enter" &&
                                  editName.trim() &&
                                  !updateMutation.isPending
                                ) {
                                  updateMutation.mutate({
                                    id: org.id,
                                    name: editName.trim(),
                                  });
                                }
                                if (e.key === "Escape") setEditingId(null);
                              }}
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              disabled={
                                !editName.trim() || updateMutation.isPending
                              }
                              onClick={() =>
                                updateMutation.mutate({
                                  id: org.id,
                                  name: editName.trim(),
                                })
                              }
                            >
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => setEditingId(null)}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <span className="font-medium">{org.name}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                            {org.license_key ?? "—"}
                          </code>
                          {org.license_key && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => copyKey(org.license_key as string)}
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={count > 0 ? "secondary" : "outline"}
                          className="text-xs"
                        >
                          <Users className="h-3 w-3 mr-1" />
                          {count}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {org.created_at
                          ? format(new Date(org.created_at), "dd.MM.yyyy", {
                              locale: de,
                            })
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {editingId !== org.id && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => {
                                setEditingId(org.id);
                                setEditName(org.name);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                disabled={count > 0}
                                title={
                                  count > 0
                                    ? "Organisation hat noch Mitglieder"
                                    : "Organisation löschen"
                                }
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Organisation löschen?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  „{org.name}" wird unwiderruflich gelöscht.
                                  Diese Aktion kann nicht rückgängig gemacht
                                  werden.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteMutation.mutate(org.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Löschen
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) setNewName("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neue Organisation erstellen</DialogTitle>
            <DialogDescription>
              Ein Lizenzschlüssel wird automatisch generiert.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Name der Organisation"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                newName.trim() &&
                !createMutation.isPending
              )
                createMutation.mutate(newName.trim());
            }}
            autoFocus
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateOpen(false);
                setNewName("");
              }}
            >
              Abbrechen
            </Button>
            <Button
              onClick={() => createMutation.mutate(newName.trim())}
              disabled={!newName.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? "Erstellen…" : "Erstellen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminOrganizations;
