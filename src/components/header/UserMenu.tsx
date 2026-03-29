import { useState } from "react";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useCustomerSession } from "@/hooks/useCustomerSession";
import { toast } from "@/hooks/use-toast";

function getInitials(name?: string | null, email?: string | null): string {
  if (name && name.trim()) {
    return name
      .trim()
      .split(/\s+/)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }
  if (email) return email[0].toUpperCase();
  return "?";
}

const UserMenu = () => {
  const { signOut, user } = useAuth();
  const { data: profile } = useProfile();
  const { endSession } = useCustomerSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const initials = getInitials(profile?.full_name, user?.email);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    endSession();
    queryClient.clear();
    toast({
      title: "Abgemeldet",
      description: "Du wurdest erfolgreich ausgeloggt.",
    });
    navigate("/login");
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full p-0"
            aria-label="Benutzermenü"
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {user && (
            <>
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium text-foreground">
                  {profile?.full_name || user.email}
                </p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
              {profile?.role && (
                <div className="px-2 pb-1.5">
                  <Badge variant="secondary" className="text-[10px] capitalize">
                    {profile.role}
                  </Badge>
                </div>
              )}
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem
            className="gap-2"
            onClick={() => setConfirmOpen(true)}
          >
            <LogOut className="h-4 w-4" />
            Abmelden
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Abmelden?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchtest du dich wirklich abmelden? Nicht gespeicherte Änderungen
              gehen verloren.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout}>
              Abmelden
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default UserMenu;
