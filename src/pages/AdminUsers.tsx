import { useState, useEffect } from "react";
import { useAdminUsers, useAllLabels, useToggleAdminRole, useAddLabelMember, useRemoveLabelMember, type AdminUser } from "@/hooks/useAdminUsers";
import { useIsPlatformAdmin } from "@/hooks/useUserRole";
import { Navigate } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Shield, UserPlus, Trash2, Search } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";

const AdminUsers = () => {
  const { user: currentUser } = useAuth();
  const { isPlatformAdmin: isAdmin, isLoading: roleLoading } = useIsPlatformAdmin();
  const { data: users, isLoading } = useAdminUsers();
  const { data: labels } = useAllLabels();
  const toggleAdmin = useToggleAdminRole();
  const addMember = useAddLabelMember();
  const removeMember = useRemoveLabelMember();

  const [search, setSearch] = useState("");
  const [dialogUser, setDialogUser] = useState<AdminUser | null>(null);
  const [newLabelId, setNewLabelId] = useState("");
  const [newLabelRole, setNewLabelRole] = useState("label_member");

  // Keep dialogUser in sync with query data after mutations
  const dialogUserId = dialogUser?.id;
  useEffect(() => {
    if (dialogUserId && users) {
      const updated = users.find(u => u.id === dialogUserId);
      if (updated) setDialogUser(updated);
    }
  }, [users, dialogUserId]);

  if (roleLoading) return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const filtered = users?.filter(u =>
    !search ||
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const handleAddLabelMember = () => {
    if (!dialogUser || !newLabelId) return;
    addMember.mutate({ userId: dialogUser.id, labelId: newLabelId, role: newLabelRole }, {
      onSuccess: () => {
        setNewLabelId("");
        setNewLabelRole("label_member");
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Benutzer & Berechtigungen
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Rollen und Label-Mitgliedschaften verwalten
          </p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Benutzer suchen…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>E-Mail</TableHead>
              <TableHead>Organisation</TableHead>
              <TableHead>Superadmin</TableHead>
              <TableHead>Admin</TableHead>
              <TableHead>Labels</TableHead>
              <TableHead className="w-[100px]">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Laden…
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Keine Benutzer gefunden
                </TableCell>
              </TableRow>
            ) : filtered.map(user => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.full_name || "–"}</TableCell>
                <TableCell className="text-muted-foreground text-xs">{user.email || "–"}</TableCell>
                <TableCell>
                  {user.org_name ? (
                    <Badge variant="outline">{user.org_name}</Badge>
                  ) : (
                    <span className="text-muted-foreground text-xs">–</span>
                  )}
                </TableCell>
                <TableCell>
                  {user.id === currentUser?.id ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <Checkbox checked disabled className="opacity-50" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>Eigene Admin-Rolle kann nicht entfernt werden</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <Checkbox
                      checked={user.roles.includes("admin")}
                      onCheckedChange={(checked) => {
                        toggleAdmin.mutate({ userId: user.id, grant: !!checked });
                      }}
                    />
                  )}
                </TableCell>
                <TableCell>
                  {user.label_memberships.some(m => m.role === "label_admin") ? (
                    <Badge variant="default" className="text-xs">Label-Admin</Badge>
                  ) : (
                    <span className="text-muted-foreground text-xs">–</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {user.label_memberships.map(m => (
                      <Badge key={m.id} variant={m.role === "label_admin" ? "default" : "secondary"} className="text-xs">
                        {m.label_name} ({m.role === "label_admin" ? "Admin" : "Member"})
                      </Badge>
                    ))}
                    {user.label_memberships.length === 0 && (
                      <span className="text-muted-foreground text-xs">–</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="ghost" onClick={() => setDialogUser(user)}>
                    <UserPlus className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Label membership dialog */}
      <Dialog open={!!dialogUser} onOpenChange={open => !open && setDialogUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Label-Mitgliedschaften: {dialogUser?.full_name || dialogUser?.email}</DialogTitle>
            <DialogDescription>Label-Zuweisungen für diesen Benutzer verwalten</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Existing memberships */}
            {dialogUser?.label_memberships.map(m => (
              <div key={m.id} className="flex items-center justify-between rounded-md border border-border p-3">
                <div>
                  <span className="font-medium">{m.label_name}</span>
                  <Badge variant="outline" className="ml-2 text-xs">{m.role === "label_admin" ? "Admin" : "Member"}</Badge>
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={removeMember.isPending}
                  onClick={() => removeMember.mutate({ membershipId: m.id })}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}

            {/* Add new */}
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Select value={newLabelId} onValueChange={setNewLabelId}>
                  <SelectTrigger><SelectValue placeholder="Label wählen…" /></SelectTrigger>
                  <SelectContent>
                    {labels?.filter(l => !dialogUser?.label_memberships.some(m => m.label_id === l.id)).map(l => (
                      <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Select value={newLabelRole} onValueChange={setNewLabelRole}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="label_member">Member</SelectItem>
                    <SelectItem value="label_admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAddLabelMember} disabled={!newLabelId || addMember.isPending}>
                <UserPlus className="h-4 w-4 mr-1" /> Hinzufügen
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogUser(null)}>Schließen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers;

